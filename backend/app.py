import uuid
from keycloak import KeycloakAdmin
from flask import Flask, request, jsonify
from keycloak import KeycloakOpenID
from functools import wraps
import os
import csv
import io
from werkzeug.utils import secure_filename
import bs4
from urllib.parse import urlparse
from functools import lru_cache
from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
from langchain.text_splitter import CharacterTextSplitter
from langchain_community.embeddings import OllamaEmbeddings
from langchain_community.chat_models import ChatOllama
from langchain_groq import ChatGroq
from langchain.memory import ConversationBufferMemory
from langchain.chains import ConversationalRetrievalChain
from langchain.retrievers import EnsembleRetriever
from langchain_community.vectorstores.pgvector import PGVector
import psycopg2
import requests
from atlassian import Confluence
from PyPDF2 import PdfReader
import os
import tempfile
import logging

app = Flask(__name__)
CORS(app, resources={r"/api/*": {"origins": "http://localhost:3000"}})

# Setting up basic logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


# Database connection string
db_connection_string = "postgresql://postgres:0000@pgvector:5432/vector"

# KeyCloak Settings
SECRET_FILE_PATH = '/shared/rag_client_secret.txt'

# Ollama settings
OLLAMA_BASE_URL = os.environ.get("OLLAMA_SERVER_URL", "http://ollama:11434")

# Add the Groq API key to the user information
groq_api_key = "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"




# Vectore Store
def create_or_update_vectorstore(text_chunks, collection_name, username):
    try:
        embeddings = OllamaEmbeddings(model="nomic-embed-text", base_url=OLLAMA_BASE_URL)
        
        # Check if the collection already exists
        with psycopg2.connect(db_connection_string) as conn:
            with conn.cursor() as cur:
                cur.execute("SELECT uuid FROM public.langchain_pg_collection WHERE name = %s AND username = %s", (collection_name, username))
                result = cur.fetchone()
                if result:
                    collection_uuid = result[0]
                else:
                    collection_uuid = uuid.uuid4()

        # Create or update the vectorstore
        vectorstore = PGVector.from_texts(
            texts=text_chunks,
            embedding=embeddings,
            collection_name=collection_name,
            connection_string=db_connection_string,
            collection_metadata={"uuid": str(collection_uuid)}
        )
        
        # Add or update collection and embeddings
        with psycopg2.connect(db_connection_string) as conn:
            with conn.cursor() as cur:
                cur.execute(
                    "INSERT INTO public.langchain_pg_collection (name, uuid, username) VALUES (%s, %s, %s) "
                    "ON CONFLICT (uuid) DO UPDATE SET name = EXCLUDED.name, username = EXCLUDED.username",
                    (collection_name, collection_uuid, username)
                )
                for i, chunk in enumerate(text_chunks):
                    embedding = embeddings.embed_query(chunk)
                    chunk_uuid = uuid.uuid4()
                    cur.execute(
                        "INSERT INTO public.langchain_pg_embedding (collection_id, embedding, document, uuid, username) "
                        "VALUES (%s, %s, %s, %s, %s) ON CONFLICT (uuid) DO NOTHING",
                        (collection_uuid, embedding, chunk, chunk_uuid, username)
                    )
                conn.commit()
        
        logger.info(f"Vectorstore created/updated for {collection_name} by user {username}")
        return vectorstore
    except Exception as e:
        logger.error(f"Error creating/updating vectorstore for {collection_name}: {e}")
        return None

def process_data(content, collection_name):
    text_chunks = get_text_chunks(content)
    return create_or_update_vectorstore(text_chunks, collection_name, username=get_authenticated_username())

def initialize_vectorstores(collections=None):
    username = get_authenticated_username()
    collection_mapping = get_collection_name(username)
    chunk_data = get_chunk_data(username)

    print(f"Initializing vectorstores for collections: {collections}")
    print(f"Available collections: {collection_mapping}")

    vectorstores = []
    for collection_name, collection_id in collection_mapping.items():
        if collections is None or collection_name in collections or not collections:
            print(f"Processing collection: {collection_name}")
            collection_chunks = [chunk[1] for chunk in chunk_data if chunk[0] == collection_id]
            if collection_chunks:
                print(f"Found {len(collection_chunks)} chunks for collection {collection_name}")
                vectorstore = PGVector(
                    collection_name=collection_name,
                    connection_string=db_connection_string,
                    embedding_function=OllamaEmbeddings(model="nomic-embed-text", base_url=OLLAMA_BASE_URL),
                    use_jsonb=True
                )
                vectorstores.append(vectorstore)
            else:
                print(f"No chunks found for collection {collection_name}")
        else:
            print(f"Skipping collection: {collection_name}")

    print(f"Initialized {len(vectorstores)} vectorstores")
    return vectorstores

def get_vectorstore(text_chunks, collection_name, username):
    vectorstore = PGVector.from_texts(
        texts=text_chunks,
        embedding=OllamaEmbeddings(model="nomic-embed-text", base_url=OLLAMA_BASE_URL),
        collection_name=collection_name,
        connection_string=db_connection_string
    )
    # Add username to the collection
    with psycopg2.connect(db_connection_string) as conn:
        with conn.cursor() as cur:
            cur.execute(
                "UPDATE public.langchain_pg_collection SET username = %s WHERE uuid = %s",
                (username, vectorstore.uuid)
            )
            conn.commit()
    return vectorstore

def get_combined_retriever(vectorstores):
    retrievers = [vs.as_retriever(search_type="similarity") for vs in vectorstores]
    return EnsembleRetriever(retrievers=retrievers, weights=[1/len(retrievers)] * len(retrievers))


# Getting collection's name
def get_collection_name(username):
    try:
        conn = psycopg2.connect(db_connection_string)
        cur = conn.cursor()
        cur.execute("SELECT name, uuid FROM langchain_pg_collection WHERE username = %s OR username = 'admin';", (username,))
        collection_mapping = {name: uuid for name, uuid in cur.fetchall()}
        cur.close()
        conn.close()
        return collection_mapping
    except Exception as e:
        logger.error(f"Error fetching data from database: {e}")
        return {}


# Getting chunks
def get_text_chunks(text):
    text_splitter = CharacterTextSplitter(separator="\n", chunk_size=1500, chunk_overlap=300, length_function=len)
    return text_splitter.split_text(text)

def get_chunk_data(username):
    try:
        conn = psycopg2.connect(db_connection_string)
        cur = conn.cursor()
        cur.execute("SELECT collection_id, document FROM langchain_pg_embedding WHERE username = %s OR username = 'admin';", (username,))
        chunk_data = cur.fetchall()
        cur.close()
        conn.close()
        return chunk_data
    except Exception as e:
        logger.error(f"Error fetching data from database: {e}")
        return []


# Conversation Chain
def initialize_conversation_chain(vectorstore, model_name, temperature, api_key=None):
    llm = ChatGroq(model_name=model_name, groq_api_key=api_key, temperature=temperature) if api_key else ChatOllama(model=model_name, temperature=temperature)
    memory = ConversationBufferMemory(memory_key="chat_history", output_key="answer", return_messages=True)
    return ConversationalRetrievalChain.from_llm(
        llm=llm,
        retriever=vectorstore.as_retriever(search_type="similarity"),
        memory=memory,
        return_source_documents=True,
    )

def conversation_chain(vectorstore, model_name, temperature, api_key=None):
    llm = ChatGroq(model_name=model_name, groq_api_key=api_key, temperature=temperature) if api_key else ChatOllama(model=model_name, temperature=temperature)
    memory = ConversationBufferMemory(memory_key="chat_history", output_key="answer", return_messages=True)
    return ConversationalRetrievalChain.from_llm(
        llm=llm,
        retriever=vectorstore.as_retriever(search_type="similarity"),
        memory=memory,
        return_source_documents=True,
    )

    

# Helper functions for URL parsing (Confluence)
def _extract_confluence_keys_from_cloud_url(wiki_url):
    parsed_url = urlparse(wiki_url)
    wiki_base = parsed_url.scheme + "://" + parsed_url.netloc + parsed_url.path.split("/spaces")[0]
    space = parsed_url.path.split("/")[3]
    return wiki_base, space

def _extract_confluence_keys_from_datacenter_url(wiki_url):
    DISPLAY = "/display/"
    parsed_url = urlparse(wiki_url)
    wiki_base = parsed_url.scheme + "://" + parsed_url.netloc + parsed_url.path.split(DISPLAY)[0]
    space = DISPLAY.join(parsed_url.path.split(DISPLAY)[1:]).split("/")[0]
    return wiki_base, space

def extract_confluence_keys_from_url(wiki_url):
    is_confluence_cloud = ".atlassian.net/wiki/spaces/" in wiki_url
    try:
        if is_confluence_cloud:
            wiki_base, space = _extract_confluence_keys_from_cloud_url(wiki_url)
        else:
            wiki_base, space = _extract_confluence_keys_from_datacenter_url(wiki_url)
    except Exception as e:
        raise ValueError(f"Not a valid Confluence Wiki Link: {e}")
    return wiki_base, space, is_confluence_cloud

# Confluence Connector Class
class ConfluenceConnector:
    def __init__(self, wiki_url, token):
        self.wiki_base, self.space, self.is_cloud = extract_confluence_keys_from_url(wiki_url)
        self.confluence = Confluence(url=self.wiki_base, token=token, cloud=self.is_cloud)
        logger.info(f"Initialized ConfluenceConnector for {self.wiki_base} in space '{self.space}'")

    @lru_cache()
    def _get_user(self, user_id):
        user_not_found = "Unknown User"
        try:
            user_name = self.confluence.get_user_details_by_accountid(user_id).get("email", user_not_found)
            logger.debug(f"User ID {user_id} resolved to {user_name}")
            return user_name
        except Exception as e:
            logger.error(f"Error in fetching user details for {user_id}: {e}")
            return user_not_found

    def parse_html_page(self, text):
        soup = bs4.BeautifulSoup(text, "html.parser")
        for user in soup.findAll("ri:user"):
            user_id = user.attrs.get("ri:account-id", user.attrs.get("ri:userkey", ""))
            user.replaceWith("@" + self._get_user(user_id))
        return str(soup)

    def get_space_content(self):
        all_content = ""
        test_content = ""
        try:
            pages = self.confluence.get_all_pages_from_space(self.space, status='current')
            print(len(pages))
            for page in pages:
                content = self.confluence.get_page_by_id(page['id'], expand='body.export_view')['body']['export_view']['value']
                export_view = self.confluence.get_page_by_id(page['id'], expand='body.export_view')['body']['export_view']['value']
                all_content += self.parse_html_page(content) + "\n"
                test_content += "::::: export_view :::::\n" + export_view + "\n\n"
            print(test_content)
        except Exception as e:
            logger.error(f"Error in fetching or processing pages from Confluence space '{self.space}': {e}")

        return all_content


# Jira Connector Class
class JiraConnector:
    def __init__(self, jira_api_token):
        self.jira_instance_url = "https://portail.agir.orange.com"
        self.jira_api_token = jira_api_token
        self.headers = {
            "Accept": "application/json",
            "Content-Type": "application/json",
            "Authorization": f"Bearer {jira_api_token}"
        }

    def get_project_issues(self, project_key):
        issues_content = ""
        url = f"{self.jira_instance_url}/rest/api/2/search"
        query = {
            'jql': f'project={project_key} AND issuetype="Story"',
            'startAt': 0,
            'maxResults': 100,
            'fields': '*all'
        }
        logging.debug(f"Making request to URL: {url} with query: {query}")
        try:
            response = requests.get(
                url,
                params=query,
                headers=self.headers
            )
            response.raise_for_status()
            issues = response.json().get('issues', [])
            for issue in issues:
                issue_key = issue['key']
                summary = issue['fields'].get('summary', 'No summary')
                description = issue['fields'].get('description', 'No description')
                issues_content += f"Issue Key: {issue_key}\nSummary: {summary}\nDescription: {description}\n\n"
        except requests.exceptions.HTTPError as http_err:
            issues_content = f"HTTP error occurred: {http_err}"
            logging.error(f"HTTP error occurred: {http_err}")
        except Exception as err:
            issues_content = f"Other error occurred: {err}"
            logging.error(f"Other error occurred: {err}")
        return issues_content

    def get_project_issue(self, project_key, issue_id):
        issue_content = ""
        url = f"{self.jira_instance_url}/rest/api/2/issue/{project_key}-{issue_id}"
        logging.debug(f"Making request to URL: {url}")
        try:
            response = requests.get(
                url,
                headers=self.headers
            )
            response.raise_for_status()
            issue = response.json()
            if issue['fields']['issuetype']['name'] == "Story":
                issue_key = issue['key']
                summary = issue['fields'].get('summary', 'No summary')
                description = issue['fields'].get('description', 'No description')
                issue_content = f"Issue Key: {issue_key}\nSummary: {summary}\nDescription: {description}\n"
        except requests.exceptions.HTTPError as http_err:
            issue_content = f"HTTP error occurred: {http_err}"
            logging.error(f"HTTP error occurred: {http_err}")
        except Exception as err:
            issue_content = f"Other error occurred: {err}"
            logging.error(f"Other error occurred: {err}")
        return issue_content
    

# Loading PDF content
def load_pdf_content(pdf_file_path):
    with open(pdf_file_path, "rb") as f:
        pdf = PdfReader(f)
        content = []
        for page_num in range(len(pdf.pages)):
            page = pdf.pages[page_num]
            content.append(page.extract_text())
        return "\n".join(content)


# Function to sanitize the text
def sanitize_text(text):
    return text.replace('\x00', '')


# Processing GitHub
def fetch_github_files(github_url):
    repo_name = github_url.split('github.com/')[-1]
    api_url = f'https://api.github.com/repos/{repo_name}/contents'

    try:
        response = requests.get(api_url)
        response.raise_for_status()
        files = response.json()

        file_contents = []
        for file in files:
            if file['type'] == 'file':
                file_response = requests.get(file['download_url'])
                file_response.raise_for_status()
                file_contents.append(file_response.text)

        return file_contents
    except requests.exceptions.RequestException as e:
        logger.error(f"Error fetching files from GitHub: {e}")
        return []

def process_github_files(file_contents):
    combined_text = "\n".join(file_contents)
    sanitized_text = sanitize_text(combined_text)
    return sanitized_text


# Processing GitLab
def fetch_gitlab_files(gitlab_repo_url, access_token):
    headers = {'Authorization': f'Bearer {access_token}'}
    try:
        # Extract project ID or namespace/path from the URL
        parsed_url = urlparse(gitlab_repo_url)
        namespace_path = parsed_url.path.lstrip('/')

        # Extract base URL from the provided GitLab URL
        gitlab_base_url = f"{parsed_url.scheme}://{parsed_url.netloc}"

        # Use the base URL to construct the correct API endpoint
        api_url = f'{gitlab_base_url}/api/v4/projects/{requests.utils.quote(namespace_path, safe="")}/repository/tree'
        logger.info(f"API URL: {api_url}")
        response = requests.get(api_url, headers=headers)
        response.raise_for_status()
        files = response.json()
        file_contents = []

        for file in files:
            if file['type'] == 'blob':
                file_url = f'{gitlab_base_url}/api/v4/projects/{requests.utils.quote(namespace_path, safe="")}/repository/files/{requests.utils.quote(file["path"], safe="")}/raw?ref=main'
                file_response = requests.get(file_url, headers=headers)
                file_response.raise_for_status()
                file_contents.append(file_response.text)

        return file_contents
    except requests.exceptions.RequestException as e:
        logger.error(f"Error fetching files from GitLab: {e}")
        return []

def process_gitlab_files(file_contents):
    combined_text = "\n".join(file_contents)
    sanitized_text = sanitize_text(combined_text)
    return sanitized_text


# Generate .csv files (Unit Tests)
def handle_userinput_csv_ut(user_question, conversation_chain):
    try:
        response = conversation_chain({"question": user_question})
        
        test_cases = []
        expected_results = []
        current_test_case = ""
        current_expected_result = ""
        is_test_case = False
        is_expected_result = False

        lines = response["answer"].split("\n")
        
        for line in lines:
            line = line.strip()
            if "Test Case" in line:
                if current_test_case:
                    test_cases.append(current_test_case.strip())
                    expected_results.append(current_expected_result.strip())
                    current_test_case = ""
                    current_expected_result = ""
                is_test_case = True
                is_expected_result = False
                parts = line.split(":", 1)
                if len(parts) > 1:
                    current_test_case += parts[1].strip() + " "
            elif "Expected Result" in line:
                is_test_case = False
                is_expected_result = True
                parts = line.split(":", 1)
                if len(parts) > 1:
                    current_expected_result += parts[1].strip() + " "
            elif is_test_case:
                current_test_case += line + " "
            elif is_expected_result:
                current_expected_result += line + " "

        if current_test_case:
            test_cases.append(current_test_case.strip())
            expected_results.append(current_expected_result.strip())
        
        return test_cases, expected_results
    except Exception as e:
        logger.error(f"Error in handle_userinput_csv_ut: {e}")
        return [], []
    
def generate_csv_ut(output):
    test_cases, expected_results = output
    csv_output = io.StringIO()
    csv_writer = csv.writer(csv_output, delimiter=';')
    csv_writer.writerow(['Test Case', 'Expected Result', 'Result'])
    for test_case, expected_result in zip(test_cases, expected_results):
        csv_writer.writerow([test_case, expected_result, ""])
    return csv_output.getvalue()


# Generate .csv files (Unit Tests)
def handle_userinput_csv_ac(user_question, conversation_chain):
    try:
        response = conversation_chain({"question": user_question})
        
        issue_ID = []
        acceptance_criteria = []
        current_issue_ID = ""
        current_acceptance_criteria = ""
        is_issue_ID = False
        is_acceptance_criteria = False

        lines = response["answer"].split("\n")
        
        for line in lines:
            line = line.strip()
            if "Issue ID" in line:
                if current_issue_ID:
                    issue_ID.append(current_issue_ID.strip())
                    acceptance_criteria.append(current_acceptance_criteria.strip())
                    current_issue_ID = ""
                    current_acceptance_criteria = ""
                is_issue_ID = True
                is_acceptance_criteria = False
                parts = line.split(":", 1)
                if len(parts) > 1:
                    current_issue_ID += parts[1].strip() + " "
            elif "Acceptance Criteria" in line:
                is_issue_ID = False
                is_acceptance_criteria = True
                parts = line.split(":", 1)
                if len(parts) > 1:
                    current_acceptance_criteria += parts[1].strip() + " "
            elif is_issue_ID:
                current_issue_ID += line + " "
            elif is_acceptance_criteria:
                current_acceptance_criteria += line + " "

        if current_issue_ID:
            issue_ID.append(current_issue_ID.strip())
            acceptance_criteria.append(current_acceptance_criteria.strip())
        
        return issue_ID, acceptance_criteria
    except Exception as e:
        logger.error(f"Error in handle_userinput_csv_ac: {e}")
        return [], []

def generate_csv_ac(output):
    issue_ID, acceptance_criteria = output
    csv_output = io.StringIO()
    csv_writer = csv.writer(csv_output, delimiter=';')
    csv_writer.writerow(['Issue ID', 'Acceptance criteria'])
    for issue, criteria in zip(issue_ID, acceptance_criteria):
        csv_writer.writerow([issue, criteria])
    return csv_output.getvalue()
    
# Getting User's Username
def get_authenticated_username():
    token = request.headers.get('Authorization')
    if not token:
        return None

    try:
        token = token.split()[1]  
        user_info = keycloak_openid.userinfo(token)
        detailed_user_info = admin.get_user(user_info['sub'])
        return detailed_user_info['username']
    except Exception as e:
        logger.error(f"Error getting authenticated username: {e}")
        return None
    
# Token
def token_required(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        token = None
        if 'Authorization' in request.headers:
            token = request.headers['Authorization'].split()[1]
        
        if not token:
            return jsonify({'message': 'Token is missing!'}), 401

        try:
            keycloak_openid.decode_token(token)
        except Exception as e:
            return jsonify({'message': 'Token is invalid!'}), 401

        return f(*args, **kwargs)
    return decorated

# function to only update tokens_used
def update_tokens_used(username, additional_tokens):
    try:
        # Fetch the user's information using the token
        token = request.headers['Authorization'].split()[1]
        user_info = keycloak_openid.userinfo(token)
        user_id = user_info['sub']

        # Get the current tokens used from the user's attributes in Keycloak
        current_tokens = int(user_info.get('attributes', {}).get('tokens_used', [0])[0])

        # Calculate the new total tokens used
        new_token_count = current_tokens + additional_tokens

        # Prepare the payload to update only the tokens_used attribute
        attributes = user_info.get('attributes', {})
        
        # Update the tokens_used attribute
        attributes['tokens_used'] = [str(new_token_count)]  # Ensure it's a list

        # Update the user's tokens_used attribute in Keycloak without altering other fields
        admin.update_user(
            user_id=user_id,
            payload={
                "attributes": attributes  # Pass the existing attributes with the updated tokens_used
            }
        )

        app.logger.info(f"Updated tokens_used for {username}: {new_token_count}")
    except Exception as e:
        app.logger.error(f"Error updating tokens used for {username}: {str(e)}")
        return jsonify({'success': False, 'error': str(e)}), 400
     


# Reading Client's Secret Key
def read_secret_key():
    with open(SECRET_FILE_PATH, 'r') as file:
        return file.read().strip()
    
# Keycloak server configuration
keycloak_openid = KeycloakOpenID(
    server_url="http://keycloak:8080/",
    client_id="rag",
    realm_name="master",
    client_secret_key=read_secret_key()
)

# Keycloak admin
admin = KeycloakAdmin(
            server_url="http://keycloak:8080/",
            username="admin",
            password="admin",
            realm_name="master",
            client_secret_key=read_secret_key(),
            verify=True
        )


# Serve React App
@app.route('/', defaults={'path': ''})
@app.route('/<path:path>')
def serve(path):
    if path != "" and os.path.exists(app.static_folder + '/' + path):
        return send_from_directory(app.static_folder, path)
    else:
        return send_from_directory(app.static_folder, 'index.html')

# Initialize VectorStores
@app.route('/api/initialize_vectorstores', methods=['GET'])
def initialize_vectorstores_route():
    try:
        vectorstores = initialize_vectorstores()
        if vectorstores:
            return jsonify({"message": "Vector stores initialized successfully", "count": len(vectorstores)})
        else:
            return jsonify({"message": "No vector stores initialized"}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/chat', methods=['POST'])
@token_required
def chat():
    print("Received chat request")
    data = request.json
    print("Request data:", data)

    # Validate required fields
    required_fields = ['question', 'model_name', 'temperature', 'chatName', 'collections']
    for field in required_fields:
        if field not in data:
            return jsonify({"error": f"Missing required field: {field}"}), 400

    user_question = data['question']
    model_name = data['model_name']
    temperature = data['temperature']
    chat_name = data['chatName']
    collections = data['collections']
    groq_api_token = data.get('groq_api_token')
    username = get_authenticated_username()

    try:
        print("Initializing vectorstores")
        vectorstores = initialize_vectorstores(collections if collections != 'all' else None)

        print(f"Initializing LLM: {'Groq' if groq_api_token else 'Ollama'}")
        if groq_api_token:
            llm = ChatGroq(model=model_name, groq_api_key=groq_api_token, temperature=temperature)
        else:
            llm = ChatOllama(model=model_name, temperature=temperature)

        # Save user message to chat history
        save_message(username, chat_name, user_question, True)

        if vectorstores:
            print("Creating combined retriever")
            combined_retriever = get_combined_retriever(vectorstores)

            print("Initializing memory")
            memory = ConversationBufferMemory(
                memory_key="chat_history",
                output_key="answer",
                return_messages=True
            )

            print("Creating conversation chain")
            conversation_chain = ConversationalRetrievalChain.from_llm(
                llm=llm,
                retriever=combined_retriever,
                memory=memory,
                return_source_documents=True,
            )

            print("Generating response")
            response = conversation_chain({"question": user_question})

            # Save bot message to chat history
            save_message(username, chat_name, response['answer'], False)

            print("Response generated successfully")
            return jsonify({
                "answer": response['answer'],
                "source_documents": [doc.page_content for doc in response['source_documents']]
            })
        else:
            print("No vectorstores initialized, using LLM directly")
            response = llm.predict(user_question)

            # Save bot message to chat history
            save_message(username, chat_name, response, False)

            return jsonify({
                "answer": response,
                "source_documents": []
            })
    except Exception as e:
        print(f"Error in chat processing: {str(e)}")
        import traceback
        traceback.print_exc()
        return jsonify({"error": str(e)}), 500
    
def save_message(username, chat_name, message_text, is_user):
    try:
        with psycopg2.connect(db_connection_string) as conn:
            with conn.cursor() as cur:
                cur.execute("""
                    INSERT INTO public.chat (username, chat_name, message_text, is_user)
                    VALUES (%s, %s, %s, %s)
                """, (username, chat_name, message_text, is_user))
            conn.commit()
    except Exception as e:
        print(f"Error saving message: {e}")
    
# Chat History
@app.route('/api/chat_history', methods=['GET'])
@token_required
def get_chat_history():
    username = get_authenticated_username()
    try:
        with psycopg2.connect(db_connection_string) as conn:
            with conn.cursor() as cur:
                cur.execute("""
                    SELECT chat_name, message_text, is_user, timestamp
                    FROM public.chat
                    WHERE username = %s
                    ORDER BY chat_name, timestamp
                """, (username,))
                rows = cur.fetchall()
                
        chat_history = {}
        for row in rows:
            chat_name, message_text, is_user, timestamp = row
            if chat_name not in chat_history:
                chat_history[chat_name] = []
            chat_history[chat_name].append({
                'text': message_text,
                'isUser': is_user,
                'timestamp': timestamp.isoformat()
            })
        
        return jsonify(chat_history)
    except Exception as e:
        return jsonify({'error': str(e)}), 500
    
@app.route('/api/rename_chat_space', methods=['POST'])
@token_required
def rename_chat_space():
    data = request.json
    old_name = data['old_name']
    new_name = data['new_name']
    username = get_authenticated_username()

    try:
        with psycopg2.connect(db_connection_string) as conn:
            with conn.cursor() as cur:
                cur.execute("""
                    UPDATE public.chat
                    SET chat_name = %s
                    WHERE username = %s AND chat_name = %s
                """, (new_name, username, old_name))
            conn.commit()
        return jsonify({"success": True, "message": "Chat space renamed successfully"})
    except Exception as e:
        print(f"Error renaming chat space: {e}")
        return jsonify({"success": False, "error": str(e)}), 500

@app.route('/api/delete_chat_space', methods=['POST'])
@token_required
def delete_chat_space():
    print("Received delete chat space request")
    data = request.json
    print(f"Request data: {data}")
    chat_name = data['chat_name']
    username = get_authenticated_username()

    try:
        with psycopg2.connect(db_connection_string) as conn:
            with conn.cursor() as cur:
                # Check if this is the only chat space
                cur.execute("""
                    SELECT COUNT(DISTINCT chat_name) FROM public.chat
                    WHERE username = %s
                """, (username,))
                chat_space_count = cur.fetchone()[0]

                if chat_space_count <= 1:
                    return jsonify({"success": False, "error": "Cannot delete the only chat space"}), 400

                # Proceed with deletion
                cur.execute("""
                    DELETE FROM public.chat
                    WHERE username = %s AND chat_name = %s
                """, (username, chat_name))
            conn.commit()
        return jsonify({"success": True, "message": "Chat space deleted successfully"})
    except Exception as e:
        print(f"Error deleting chat space: {e}")
        return jsonify({"success": False, "error": str(e)}), 500
    
@app.route('/api/delete_all_chat_history', methods=['POST'])
@token_required
def delete_all_chat_history():
    print("Received delete all chat history request")
    username = get_authenticated_username()

    try:
        with psycopg2.connect(db_connection_string) as conn:
            with conn.cursor() as cur:
                # Delete all chat history
                cur.execute("""
                    DELETE FROM public.chat
                    WHERE username = %s
                """, (username,))
                
                # Create a default chat space
                default_chat_name = "Default Chat"
                cur.execute("""
                    INSERT INTO public.chat (username, chat_name, message_text, is_user)
                    VALUES (%s, %s, %s, %s)
                """, (username, default_chat_name, "Welcome to your new chat!", False))
            conn.commit()
        return jsonify({"success": True, "message": "All chat history deleted and default chat space created"})
    except Exception as e:
        print(f"Error deleting all chat history: {e}")
        return jsonify({"success": False, "error": str(e)}), 500
    
# Processing Confluence
@app.route('/api/process_confluence', methods=['POST'])
@token_required
def process_confluence():
    data = request.json
    confluence_token = data['confluence_token']
    confluence_space_url = data['confluence_space_url']
    username = get_authenticated_username()

    try:
        connector = ConfluenceConnector(confluence_space_url, confluence_token)
        space_content = connector.get_space_content()
        text_chunks = get_text_chunks(space_content)
        vectorstore = create_or_update_vectorstore(text_chunks, "Confluence Space", username)
        if vectorstore:
            return jsonify({"message": "Confluence Space Issue processed successfully!"}), 200
        else:
            return jsonify({"error": "Failed to process Confluence Space Issue"}), 500
    except Exception as e:
        return jsonify({"error": str(e)}), 400

# Processing Jira Project
@app.route('/api/process_jira', methods=['POST'])
@token_required
def process_jira():
    data = request.json
    jira_api_token = data['jira_api_token']
    jira_project_key = data['jira_project_key']
    username = get_authenticated_username()

    try:
        jira_connector = JiraConnector(jira_api_token)
        issues = jira_connector.get_project_issues(jira_project_key)
        text_chunks = get_text_chunks(issues)
        vectorstore = create_or_update_vectorstore(text_chunks, "Jira Project", username)
        if vectorstore:
            return jsonify({"message": "Jira Project processed successfully!"}), 200
        else:
            return jsonify({"error": "Failed to process Jira Project"}), 500
    except Exception as e:
        return jsonify({"error": str(e)}), 400

# Processing Jira Issue
@app.route('/api/process_jira_issue', methods=['POST'])
@token_required
def process_jira_issue():
    data = request.json
    jira_api_token = data['jira_api_token']
    jira_project_key = data['jira_project_key']
    jira_issue_id = data['jira_issue_id']
    username = get_authenticated_username()

    try:
        jira_connector = JiraConnector(jira_api_token)
        issue = jira_connector.get_project_issue(jira_project_key, jira_issue_id)
        text_chunks = get_text_chunks(issue)
        vectorstore = create_or_update_vectorstore(text_chunks, "Jira Issue", username)
        if vectorstore:
            return jsonify({"message": "Jira Issue processed successfully!"}), 200
        else:
            return jsonify({"error": "Failed to process Jira Issue"}), 500
    except Exception as e:
        return jsonify({"error": str(e)}), 400

# Processing PDFs
@app.route('/api/process_pdf', methods=['POST'])
@token_required
def process_pdf():
    if 'file' not in request.files:
        return jsonify({"error": "No file part"}), 400
    file = request.files['file']
    if file.filename == '':
        return jsonify({"error": "No selected file"}), 400

    username = get_authenticated_username()

    if file and file.filename.lower().endswith('.pdf'):
        try:
            # Save the file temporarily
            filename = secure_filename(file.filename)
            temp_dir = tempfile.mkdtemp()
            file_path = os.path.join(temp_dir, filename)
            file.save(file_path)

            # Process the PDF
            pdf_content = load_pdf_content(file_path)

            # Clean up the temporary file
            os.remove(file_path)
            os.rmdir(temp_dir)

            # Process the content
            text_chunks = get_text_chunks(pdf_content)
            vectorstore = create_or_update_vectorstore(text_chunks, "PDF Document", username)
            if vectorstore:
                return jsonify({"message": "PDF processed successfully!"}), 200
            else:
                return jsonify({"error": "Failed to process PDF"}), 500
        except Exception as e:
            logger.error(f"Error processing PDF: {str(e)}")
            return jsonify({"error": f"Error processing PDF: {str(e)}"}), 500
    else:
        return jsonify({"error": "Invalid file type. Please upload a PDF."}), 400

# Processing GitHub
@app.route('/api/process_github', methods=['POST'])
@token_required
def process_github():
    data = request.json
    github_repo_url = data['github_repo_url']
    username = get_authenticated_username()

    try:
        file_contents = fetch_github_files(github_repo_url)
        combined_text = process_github_files(file_contents)
        text_chunks = get_text_chunks(combined_text)
        vectorstore = create_or_update_vectorstore(text_chunks, "GitHub Repository", username)
        if vectorstore:
            return jsonify({"message": "GitHub repository processed successfully!"}), 200
        else:
            return jsonify({"error": "Failed to process GitHub"}), 500
    except Exception as e:
        return jsonify({"error": str(e)}), 400
    
# Processing GitLab
@app.route('/api/process_gitlab', methods=['POST'])
@token_required
def process_gitlab():
    data = request.json
    gitlab_personal_token = data['gitlab_personal_token']
    gitlab_project_token = data['gitlab_project_token']
    gitlab_repo_url = data['gitlab_repo_url']
    username = get_authenticated_username()

    try:
        access_token = gitlab_project_token if gitlab_project_token else gitlab_personal_token
        file_contents = fetch_gitlab_files(gitlab_repo_url, access_token)
        combined_text = process_gitlab_files(file_contents)
        text_chunks = get_text_chunks(combined_text)
        vectorstore = create_or_update_vectorstore(text_chunks, "GitLab Repository", username)
        if vectorstore:
            return jsonify({"message": "GitLab repository processed successfully!"}), 200
        else:
            return jsonify({"error": "Failed to process GitLab"}), 500
    except Exception as e:
        return jsonify({"error": str(e)}), 400

# Displaying KB
@app.route('/api/knowledge_base/<table_name>', methods=['GET'])
@token_required
def get_table_data(table_name):
    username = get_authenticated_username()  
    
    try:
        conn = psycopg2.connect(db_connection_string)
        cur = conn.cursor()

        # Define the columns to select based on the table name
        if table_name == "langchain_pg_collection":
            columns_to_select = "name, uuid"
        elif table_name == "langchain_pg_embedding":
            columns_to_select = "collection_id, document, uuid"
        else:
            return jsonify({"error": "Invalid table name"}), 400

        cur.execute(f"SELECT {columns_to_select} FROM {table_name} WHERE username = %s;", (username,))
        rows = cur.fetchall()
        columns = [desc[0] for desc in cur.description]
        cur.close()
        conn.close()
        
        result = []
        for row in rows:
            result.append(dict(zip(columns, row)))
        
        return jsonify(result)
    except Exception as e:
        logger.error(f"Error fetching data from {table_name}: {str(e)}")
        return jsonify({"error": str(e)}), 500

# Deleting from KB
@app.route('/api/knowledge_base/delete', methods=['POST'])
def delete_from_knowledge_base():
    data = request.json
    table = data.get('table')
    uuid = data.get('uuid')

    try:
        conn = psycopg2.connect(db_connection_string)
        cur = conn.cursor()
        cur.execute(f"DELETE FROM {table} WHERE uuid = %s", (uuid,))
        conn.commit()
        cur.close()
        conn.close()
        return jsonify({"message": "Successfully deleted from knowledge base"})
    except Exception as e:
        logger.error(f"Error deleting from knowledge base: {str(e)}")
        return jsonify({"error": str(e)}), 500
    
# Generating Unit Tests
@app.route('/api/generate_unit_tests', methods=['POST'])
def generate_unit_tests():
    data = request.json
    prompt = data['prompt']
    model_name = data['model_name']
    temperature = data['temperature']
    groq_api_token = data.get('groq_api_token')

    try:
        collection_mapping = get_collection_name(get_authenticated_username())
        chunk_data = get_chunk_data(get_authenticated_username())
        gitlab_uuid = collection_mapping.get("GitLab Repository")
        
        if gitlab_uuid:
            gitlab_chunks = [chunk[1] for chunk in chunk_data if chunk[0] == gitlab_uuid]
            if gitlab_chunks:
                vectorstore = get_vectorstore(gitlab_chunks, "GitLab Repository")
                llm = ChatGroq(model=model_name, groq_api_key=groq_api_token, temperature=temperature) if groq_api_token else ChatOllama(model=model_name, temperature=temperature)
                memory = ConversationBufferMemory(memory_key="chat_history", output_key="answer", return_messages=True)
                conversation_chain = ConversationalRetrievalChain.from_llm(
                    llm=llm,
                    retriever=vectorstore.as_retriever(search_type="similarity"),
                    memory=memory,
                    return_source_documents=True,
                )
                output = handle_userinput_csv_ut(prompt, conversation_chain)
                csv_content = generate_csv_ut(output)
                return csv_content, 200, {'Content-Type': 'text/csv'}
            else:
                return jsonify({"error": "No GitLab chunks found"}), 400
        else:
            return jsonify({"error": "GitLab Repository collection not found"}), 400
    except Exception as e:
        logger.error(f"Error generating unit tests: {e}")
        return jsonify({"error": str(e)}), 500

# Generating Acceptance Criteria
@app.route('/api/generate_acceptance_criteria', methods=['POST'])
def generate_acceptance_criteria():
    data = request.json
    prompt = data['prompt']
    model_name = data['model_name']
    temperature = data['temperature']
    groq_api_token = data.get('groq_api_token')

    try:
        collection_mapping = get_collection_name(get_authenticated_username())
        chunk_data = get_chunk_data(get_authenticated_username())
        jira_project_uuid = collection_mapping.get("Jira Project")
        jira_issue_uuid = collection_mapping.get("Jira Issue")
        if jira_project_uuid or jira_issue_uuid:
            jira_project_chunks = [chunk[1] for chunk in chunk_data if chunk[0] == jira_project_uuid]
            jira_issue_chunks = [chunk[1] for chunk in chunk_data if chunk[0] == jira_issue_uuid]
            if jira_project_chunks:
                vectorstore = get_vectorstore(jira_project_chunks, "Jira Project")
            else:
                vectorstore = get_vectorstore(jira_issue_chunks, "Jira Issue")
            llm = ChatGroq(model=model_name, groq_api_key=groq_api_token, temperature=temperature) if groq_api_token else ChatOllama(model=model_name, temperature=temperature)
            memory = ConversationBufferMemory(memory_key="chat_history", output_key="answer", return_messages=True)
            conversation_chain = ConversationalRetrievalChain.from_llm(
                llm=llm,
                retriever=vectorstore.as_retriever(search_type="similarity"),
                memory=memory,
                return_source_documents=True,
            )
            output = handle_userinput_csv_ac(prompt, conversation_chain)
            csv_content = generate_csv_ac(output)
            return csv_content, 200, {'Content-Type': 'text/csv'}
        else:
            return jsonify({"error": "No Jira chunks found"}), 400
    except Exception as e:
        logger.error(f"Error generating acceptance criteria: {e}")
        return jsonify({"error": str(e)}), 500

# LogIn
@app.route('/api/login', methods=['POST'])
def login():
    auth = request.json
    try:
        token = keycloak_openid.token(auth['username'], auth['password'])
        return jsonify({'authenticated': True, 'token': token['access_token']})
    except Exception as e:
        return jsonify({'authenticated': False, 'error': str(e)}), 401

# SignUp
@app.route('/api/signup', methods=['POST'])
def signup():
    user_info = request.json
    try:
        # Groq API key for the user
        # groq_api_key = "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"

        # Create the user with the additional attributes
        new_user = admin.create_user({
            "email": user_info['email'],
            "username": user_info['username'],
            "firstName": user_info['firstName'],
            "lastName": user_info['lastName'],
            "enabled": True,
            # "attributes": {
            #     "groq_api_key": groq_api_key
            #     # "tokens_used": str(tokens_used) 
            # },
            "credentials": [{"value": user_info['password'], "type": "password"}]
        })
        
        return jsonify({'success': True, 'user_id': new_user})
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 400

# Checking Authentication credentials
@app.route('/api/check_auth', methods=['GET'])
def check_auth():
    token = request.headers.get('Authorization')
    if not token:
        return jsonify({'authenticated': False, 'message': 'No token provided'}), 200

    try:
        token = token.split()[1]
        keycloak_openid.decode_token(token)
        return jsonify({'authenticated': True})
    except Exception as e:
        return jsonify({'authenticated': False, 'message': str(e)}), 200

# Getting User's Info
@app.route('/api/user-info', methods=['GET'])
def get_user_info():
    token = request.headers.get('Authorization')
    if not token:
        return jsonify({'error': 'No token provided'}), 401

    try:
        token = token.split()[1]  
        user_info = keycloak_openid.userinfo(token)
        
        detailed_user_info = admin.get_user(user_info['sub'])
        
        return jsonify({
            'username': detailed_user_info['username'],
            'firstName': detailed_user_info.get('firstName', 'N/A'),
            'lastName': detailed_user_info.get('lastName', 'N/A'),
            'email': detailed_user_info.get('email', 'N/A')
        })
    except Exception as e:
        return jsonify({'error': str(e), 'message': 'Token may be expired'}), 200

# LogOut
@app.route('/api/logout', methods=['POST'])
def logout():
    return jsonify({'success': True})

# Updating User's Info
@app.route('/api/update-user-info', methods=['PUT'])
@token_required
def update_user_info():
    token = request.headers['Authorization'].split()[1]
    user_data = request.json
    try:
        user_info = keycloak_openid.userinfo(token)
        app.logger.info(f"Updating user info for user ID: {user_info['sub']}")
        app.logger.info(f"Received user data: {user_data}")
        update_payload = {
            'firstName': user_data.get('firstName'),
            'lastName': user_data.get('lastName'),
            'email': user_data.get('email')
        }
        admin.update_user(
            user_id=user_info['sub'],
            payload=update_payload
        )
        
        return jsonify({'success': True, 'message': 'User information updated successfully'})
    except Exception as e:
        app.logger.error(f"Error updating user info: {str(e)}")
        return jsonify({'success': False, 'error': str(e)}), 400

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=True)