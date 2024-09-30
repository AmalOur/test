import remarkGfm from 'remark-gfm';
import rehypeRaw from 'rehype-raw';
import ReactMarkdown from 'react-markdown';
import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { User, Bot, Upload, MessageCircleIcon, MessageCircleQuestionIcon } from 'lucide-react';
import { Send, Settings, X, Menu, ChevronDown, ChevronRight, Trash2, PlusCircleIcon, Database, Loader, LogOut, MoreVertical } from 'lucide-react';
import { FaDochub, FaFilePdf, FaNewspaper } from 'react-icons/fa';
import { Edit2, PlusCircle} from 'lucide-react';
import { motion, AnimatePresence} from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Copy, Check } from 'lucide-react';
import './ChatPage.css';

const ManageContextModal = ({ isOpen, onClose, chatName, collections, selectedCollections, onSave }) => {
    const [useAllCollections, setUseAllCollections] = useState(selectedCollections?.length === 0 ?? true);
    const [selected, setSelected] = useState(selectedCollections || []);

    useEffect(() => {
        setUseAllCollections(selectedCollections?.length === 0 ?? true);
        setSelected(selectedCollections || []);
    }, [selectedCollections]);

    const handleToggleAll = () => {
        setUseAllCollections(!useAllCollections);
        setSelected(useAllCollections ? [] : []);
    };

    const handleToggle = (collection) => {
        if (useAllCollections) {
            setUseAllCollections(false);
            setSelected([collection]);
        } else {
            setSelected(prev => 
                prev.includes(collection) 
                    ? prev.filter(c => c !== collection)
                    : [...prev, collection]
            );
        }
    };

    const handleSave = () => {
        onSave(chatName, useAllCollections ? [] : selected);
        onClose();
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={`Manage Context for ${chatName}`}>
            <div className="space-y-4">
                <label className="flex items-center space-x-3">
                    <input
                        type="checkbox"
                        checked={useAllCollections}
                        onChange={handleToggleAll}
                        className="form-checkbox h-5 w-5 text-blue-600"
                    />
                    <span className="text-gray-900 font-medium">Use all collections (default)</span>
                </label>
                <div className={useAllCollections ? 'opacity-50 pointer-events-none' : ''}>
                    <p className="text-sm text-gray-600 mb-2">Or select specific collections:</p>
                    {collections.map(collection => (
                        <label key={collection} className="flex items-center space-x-3">
                            <input
                                type="checkbox"
                                checked={selected.includes(collection)}
                                onChange={() => handleToggle(collection)}
                                className="form-checkbox h-5 w-5 text-blue-600"
                                disabled={useAllCollections}
                            />
                            <span className="text-gray-900 font-medium">{collection}</span>
                        </label>
                    ))}
                </div>
                <div className="flex justify-end space-x-2 mt-4">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleSave}
                        className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
                    >
                        Save
                    </button>
                </div>
            </div>
        </Modal>
    );
};

const ChatSpaceSettingsMenu = ({ chatName, onClose, onRename, onDelete, onManageContext, collections, selectedCollections, onSave }) => {
    const [newName, setNewName] = useState(chatName);
    const [selectedContexts, setSelectedContexts] = useState(selectedCollections);
    const [useAllCollections, setUseAllCollections] = useState(selectedCollections.length === 0);

    useEffect(() => {
        setSelectedContexts(selectedCollections);
        setUseAllCollections(selectedCollections.length === 0);
    }, [selectedCollections]);

    const handleToggleAll = () => {
        setUseAllCollections(!useAllCollections);
        setSelectedContexts(useAllCollections ? [] : []);
    };

    const handleToggle = (collection) => {
        setSelectedContexts(prev => 
            prev.includes(collection) 
                ? prev.filter(c => c !== collection)
                : [...prev, collection]
        );
        setUseAllCollections(false);
    };

    const handleSave = () => {
        onRename(chatName, newName);
        onSave(chatName, useAllCollections ? [] : selectedContexts);
        onClose();
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <motion.div 
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                className="bg-white rounded-lg shadow-xl w-full max-w-md overflow-hidden"
            >
                <div className="px-6 py-4 bg-gray-50 border-b border-gray-200 flex justify-between items-center">
                    <h2 className="text-xl font-semibold text-gray-800">Chat Space Settings</h2>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
                        <X size={24} />
                    </button>
                </div>
                <div className="px-6 py-4 space-y-6">
                    <div>
                        <label htmlFor="chatName" className="block text-sm font-medium text-gray-700 mb-1">
                            Chat Space Name
                        </label>
                        <input
                            type="text"
                            id="chatName"
                            value={newName}
                            onChange={(e) => setNewName(e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                        />
                    </div>
                    <div>
                        <h3 className="text-sm font-medium text-gray-700 mb-2">Context Management</h3>
                        <div className="space-y-2">
                            <label className="flex items-center space-x-3 p-2 rounded-md hover:bg-gray-50 transition-colors">
                                <input
                                    type="checkbox"
                                    checked={useAllCollections}
                                    onChange={handleToggleAll}
                                    className="form-checkbox h-5 w-5 text-blue-600 rounded focus:ring-blue-500 transition-colors"
                                />
                                <span className="text-gray-700">Use all collections</span>
                            </label>
                            <div className={`space-y-2 ${useAllCollections ? 'opacity-50' : ''}`}>
                                {collections.map(collection => (
                                    <label key={collection} className="flex items-center space-x-3 p-2 rounded-md hover:bg-gray-50 transition-colors">
                                        <input
                                            type="checkbox"
                                            checked={selectedContexts.includes(collection)}
                                            onChange={() => handleToggle(collection)}
                                            className="form-checkbox h-5 w-5 text-blue-600 rounded focus:ring-blue-500 transition-colors"
                                            disabled={useAllCollections}
                                        />
                                        <span className="text-gray-700">{collection}</span>
                                    </label>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
                <div className="px-6 py-4 bg-gray-50 border-t border-gray-200">
                    <div className="flex flex-col items-center space-y-4">
                        <button
                            onClick={() => onDelete(chatName)}
                            className="w-full max-w-xs px-4 py-2 border border-red-300 rounded-md text-sm font-medium text-red-600 hover:text-white hover:bg-red-600 hover:border-black transition-colors flex items-center justify-center"
                        >
                            <Trash2 size={18} className="mr-1" />
                            Delete
                        </button>
                        <div className="flex justify-center items-center space-x-4 w-full max-w-xs">
                            <button
                                onClick={onClose}
                                className="w-full px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleSave}
                                className="w-full px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-black bg-gray-200 border-black hover:bg-gray-700 hover:text-white transition-colors flex items-center justify-center"
                            >
                                <Check size={18} className="mr-1" />
                                Save Changes
                            </button>
                        </div>
                    </div>
                </div>
            </motion.div>
        </div>
    );
};

const SidebarItem = ({ icon: Icon, text, onClick, isActive }) => (
    <button
        className={`flex items-center w-full px-4 py-3 mb-2 rounded-lg transition-colors duration-200 ${
            isActive ? 'bg-orange-600 text-white' : 'text-gray-300 hover:bg-darkred-900 hover:text-white'
        }`}
        onClick={onClick}
    >
        <Icon size={15} className="mr-2" />
        <span className="text-sm font-medium">{text}</span>
    </button>
);

const SidebarCategory = ({ category, isActive, toggleCategory, children }) => (
    <div className="mb-2">
        <button
            className={`flex items-center justify-between w-full px-4 py-3 rounded-lg transition-colors duration-200 ${
                isActive ? 'bg-darkred-900 text-white' : 'text-gray-300 hover:bg-darkred-900 hover:text-white'
            }`}
            onClick={toggleCategory}
        >
            <div className="flex items-center">
                {React.createElement(category.icon, { size: 15, className: "mr-3" })}
                <span className="text-sm font-medium">{category.name}</span>
            </div>
            {isActive ? <ChevronDown size={13} /> : <ChevronRight size={13} />}
        </button>
        <AnimatePresence>
            {isActive && (
                <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.3 }}
                    className="mt-2 ml-2 pl-4 border-l border-darkred-900"
                >
                    {children}
                </motion.div>
            )}
        </AnimatePresence>
    </div>
);


const Modal = ({ isOpen, onClose, title, children }) => (
    <AnimatePresence>
        {isOpen && (
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4"
                onClick={onClose}
            >
                <motion.div
                    initial={{ y: 50, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    exit={{ y: 50, opacity: 0 }}
                    className="bg-white rounded-lg w-full max-w-md max-h-[80vh] overflow-y-auto shadow-xl"
                    onClick={(e) => e.stopPropagation()}
                >
                    <div className="flex justify-between items-center p-4 border-b">
                        <h2 className="text-xl font-semibold text-gray-800">{title}</h2>
                        <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
                            <X size={24} />
                        </button>
                    </div>
                    <div className="p-4">
                        {children}
                    </div>
                </motion.div>
            </motion.div>
        )}
    </AnimatePresence>
);

const GenerateUnitTestsModal = ({ isOpen, onClose, onGenerate, isProcessing }) => {
    const [prompt, setPrompt] = useState('');

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Generate Unit Tests">
            <div className="space-y-4">
                <textarea
                    className="w-full px-3 py-2 text-gray-700 border rounded-lg focus:outline-none"
                    rows="4"
                    placeholder="Enter your prompt template for generating unit tests..."
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                ></textarea>
                <button
                    onClick={() => onGenerate(prompt)}
                    className="w-full bg-orange-600 text-white rounded-lg py-2 px-4 hover:bg-orange-700 transition-colors duration-200 relative"
                    disabled={isProcessing}
                >
                    {isProcessing ? (
                        <>
                            <Loader className="animate-spin h-5 w-5 mr-2 inline-block" />
                            Processing your request...
                        </>
                    ) : (
                        'Generate Unit Tests'
                    )}
                </button>
            </div>
        </Modal>
    );
};

const GenerateAcceptanceCriteriaModal = ({ isOpen, onClose, onGenerate, isProcessing }) => {
    const [prompt, setPrompt] = useState('');

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Generate Acceptance Criteria">
            <div className="space-y-4">
                <textarea
                    className="w-full px-3 py-2 text-gray-700 border rounded-lg focus:outline-none"
                    rows="4"
                    placeholder="Enter your prompt template for generating acceptance criteria..."
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                ></textarea>
                <button
                    onClick={() => onGenerate(prompt)}
                    className="w-full bg-orange-600 text-white rounded-lg py-2 px-4 hover:bg-orange-700 transition-colors duration-200 relative"
                    disabled={isProcessing}
                >
                    {isProcessing ? (
                        <>
                            <Loader className="animate-spin h-5 w-5 mr-2 inline-block" />
                            Processing your request...
                        </>
                    ) : (
                        'Generate Acceptance Criteria'
                    )}
                </button>
            </div>
        </Modal>
    );
};


const PdfProcessor = ({ isOpen, onClose, onProcess, modelName, temperature, groqApiToken }) => {
    const [pdfFile, setPdfFile] = useState(null);

    const handleFileChange = (e) => {
        if (e.target.files.length > 0) {
            setPdfFile(e.target.files[0]);
        }
    };

    const handleProcess = async () => {
        if (!pdfFile) return;

        const formData = new FormData();
        formData.append('file', pdfFile);
        formData.append('model_name', modelName);
        formData.append('temperature', temperature);
        formData.append('groq_api_token', groqApiToken);

        try {
            const response = await axios.post('/api/process_pdf', formData, {
                headers: {
                    'Content-Type': 'multipart/form-data'
                }
            });
            onProcess(response.data);
            onClose();
        } catch (error) {
            console.error('Error processing PDF:', error);
        }
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Process PDF Document">
            <div className="space-y-4">
                <div>
                    <label className="block mb-2 text-sm font-medium text-gray-700">Upload PDF</label>
                    <input
                        type="file"
                        accept=".pdf"
                        onChange={handleFileChange}
                        className="block w-full text-sm text-gray-500
                            file:mr-4 file:py-2 file:px-4
                            file:rounded-full file:border-0
                            file:text-sm file:font-semibold
                            file:bg-blue-50 file:text-blue-700
                            hover:file:bg-blue-100"
                    />
                </div>
                <button
                    onClick={handleProcess}
                    className="w-full bg-blue-600 text-white rounded-lg py-2 px-4 hover:bg-blue-700 transition-colors duration-200"
                    disabled={!pdfFile}
                >
                    Process PDF
                </button>
            </div>
        </Modal>
    );
};

const CopyButton = ({ text, isFullMessage = false }) => {
    const [isCopied, setIsCopied] = useState(false);

    const handleCopy = async () => {
        try {
            await navigator.clipboard.writeText(text);
            setIsCopied(true);
            setTimeout(() => setIsCopied(false), 2000);
        } catch (err) {
            console.error('Failed to copy text: ', err);
        }
    };

    return (
        <button
            onClick={handleCopy}
            className={`p-1 rounded ${isFullMessage ? 'absolute top-2 right-2' : 'absolute top-1 right-1'} 
                       ${isCopied ? 'text-green-500' : 'text-gray-500'} 
                       hover:bg-gray-200 transition-colors duration-200`}
            title={isFullMessage ? "Copy full message" : "Copy code"}
        >
            {isCopied ? <Check size={16} /> : <Copy size={16} />}
        </button>
    );
};

const ChatMessage = ({ message, isUser, sender }) => {
    const { text } = message;

    return (
        <div className={`mb-4 ${isUser ? 'items-end' : 'items-start'} flex flex-col`}>
            <div className={`flex items-center ${isUser ? 'justify-end' : 'justify-start'} mb-1`}>
                {isUser ? (
                    <User size={16} className="text-gray-500 mr-1" />
                ) : (
                    <Bot size={16} className="text-blue-500 mr-1" />
                )}
                <span className="text-xs text-gray-500">{sender}</span>
            </div>
            <div
                className={`p-3 rounded-lg max-w-[80%] shadow-sm relative ${
                    isUser ? 'bg-darkred-800 text-white self-end' : 'bg-white text-gray-800 self-start'
                }`}
            >
                {!isUser && <CopyButton text={text} isFullMessage />}
                <ReactMarkdown
                    remarkPlugins={[remarkGfm]}
                    rehypePlugins={[rehypeRaw]}
                    className="markdown-content prose prose-sm max-w-none"
                    components={{
                        p: ({ node, ...props }) => <p className="mb-2 last:mb-0" {...props} />,
                        ul: ({ node, ...props }) => <ul className="list-disc pl-4 mb-2" {...props} />,
                        ol: ({ node, ...props }) => <ol className="list-decimal pl-4 mb-2" {...props} />,
                        li: ({ node, ...props }) => <li className="mb-1" {...props} />,
                        a: ({ node, ...props }) => <a className="text-blue-500 hover:underline" {...props} />,
                        code: ({ node, inline, className, children, ...props }) => {
                            const match = /language-(\w+)/.exec(className || '');
                            const language = match ? match[1] : '';
                            return !inline ? (
                                <div className="relative">
                                    <CopyButton text={String(children).replace(/\n$/, '')} />
                                    <code className={`block bg-gray-100 rounded p-2 text-sm overflow-x-auto ${language ? `language-${language}` : ''}`} {...props}>
                                        {children}
                                    </code>
                                </div>
                            ) : (
                                <code className="bg-gray-100 rounded px-1 py-0.5 text-sm" {...props}>
                                    {children}
                                </code>
                            );
                        }
                    }}
                >
                    {text}
                </ReactMarkdown>
            </div>
        </div>
    );
};

const UserInfoModal = ({ isOpen, onClose, userInfo, onLogout, onEdit, onDeleteAllChatHistory }) => (
    <Modal isOpen={isOpen} onClose={onClose} title="User Information">
        <div className="space-y-4">
            <p><strong>Username:</strong> {userInfo.username}</p>
            <p><strong>Firstname:</strong> {userInfo.firstName}</p>
            <p><strong>Lastname:</strong> {userInfo.lastName}</p>
            <p><strong>Email:</strong> {userInfo.email}</p>
            <button
                onClick={onEdit}
                className="w-full bg-orange-600 text-white rounded-lg py-2 px-4 hover:bg-orange-700 transition-colors duration-200 mb-2"
            >
                <Edit2 size={16} className="inline mr-2" />
                Edit Information
            </button>
            <button
                onClick={onDeleteAllChatHistory}
                className="w-full bg-orange-600 text-white rounded-lg py-2 px-4 hover:bg-red-700 transition-colors duration-200 mb-2"
            >
                <Trash2 size={16} className="inline mr-2" />
                Delete All Chat History
            </button>
            <button
                onClick={onLogout}
                className="w-full bg-orange-600 text-white rounded-lg py-2 px-4 hover:bg-orange-700 transition-colors duration-200"
            >
                <LogOut size={16} className="inline mr-2" />
                Logout
            </button>
        </div>
    </Modal>
);

const EditUserInfoModal = ({ isOpen, onClose, userInfo, onSave }) => {
    const [editedInfo, setEditedInfo] = useState(userInfo);

    const handleChange = (e) => {
        setEditedInfo({ ...editedInfo, [e.target.name]: e.target.value });
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        onSave(editedInfo);
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Edit User Information">
            <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                    <label className="block text-sm font-medium text-gray-700">Username (cannot be changed)</label>
                    <input
                        type="text"
                        name="username"
                        value={editedInfo.username}
                        disabled
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm bg-gray-100 cursor-not-allowed"
                    />
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700">Firstname</label>
                    <input
                        type="firstName"
                        name="firstName"
                        value={editedInfo.firstName}
                        onChange={handleChange}
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-orange-300 focus:ring focus:ring-orange-200 focus:ring-opacity-50"
                    />
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700">Lastname</label>
                    <input
                        type="lastName"
                        name="lastName"
                        value={editedInfo.lastName}
                        onChange={handleChange}
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-orange-300 focus:ring focus:ring-orange-200 focus:ring-opacity-50"
                    />
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700">Email</label>
                    <input
                        type="email"
                        name="email"
                        value={editedInfo.email}
                        onChange={handleChange}
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-orange-300 focus:ring focus:ring-orange-200 focus:ring-opacity-50"
                    />
                </div>
                <button
                    type="submit"
                    className="w-full bg-orange-600 text-white rounded-lg py-2 px-4 hover:bg-orange-700 transition-colors duration-200"
                >
                    Save Changes
                </button>
            </form>
        </Modal>
    );
};



export default function ChatPage() {
    const [message, setMessage] = useState('');
    const [messages, setMessages] = useState({});
    const [isSidebarOpen, setIsSidebarOpen] = useState(true);
    const [activeChat, setActiveChat] = useState();
    const [isPdfOpen, setIsPdfOpen] = useState(false);
    const [activeCategory, setActiveCategory] = useState(null);
    const [confluenceToken, setConfluenceToken] = useState('');
    const [confluenceUrl, setConfluenceUrl] = useState('');
    const [jiraToken, setJiraToken] = useState('');
    const [jiraProjectKey, setJiraProjectKey] = useState('');
    const [jiraIssueId, setJiraIssueId] = useState('');
    const [showTokens, setShowTokens] = useState(false);
    const [isGroq, setIsGroq] = useState(false);
    const [groqApiToken, setGroqApiToken] = useState('');
    const [localModel, setLocalModel] = useState('llama3');
    const [temperature, setTemperature] = useState(0.7);
    const [isProcessing, setIsProcessing] = useState(false);
    const [pdfFile, setPdfFile] = useState(null);
    const [githubRepoUrl, setGithubRepoUrl] = useState('');
    const [gitlabRepoUrl, setGitlabRepoUrl] = useState('');
    const [gitlabPersonalToken, setGitlabPersonalToken] = useState('');
    const [gitlabProjectToken, setGitlabProjectToken] = useState('');
    const [groqModel, setGroqModel] = useState('llama3-8b-8192');

    const [isGenerateUnitTestsOpen, setIsGenerateUnitTestsOpen] = useState(false);
    const [isGenerateAcceptanceCriteriaOpen, setIsGenerateAcceptanceCriteriaOpen] = useState(false);
    const [isGeneratingUnitTests, setIsGeneratingUnitTests] = useState(false);
    const [isGeneratingAcceptanceCriteria, setIsGeneratingAcceptanceCriteria] = useState(false);

    const messagesEndRef = useRef(null);
    const textareaRef = useRef(null);
    const navigate = useNavigate();

    const [isAuthenticated, setIsAuthenticated] = useState(true);
    const [userInfo, setUserInfo] = useState({ username: '', email: '', firstName: '', lastName: '' });
    const [isUserInfoOpen, setIsUserInfoOpen] = useState(false);
    const [isEditUserInfoOpen, setIsEditUserInfoOpen] = useState(false);

    const [chatSpaces, setChatSpaces] = useState([]);
    const [activeChatSpace, setActiveChatSpace] = useState('Default Chat');
    const [isSpaceMenuOpen, setIsSpaceMenuOpen] = useState(false);
    const [isRenaming, setIsRenaming] = useState(false);
    const [newSpaceName, setNewSpaceName] = useState('');
    const [activeSpaceMenu, setActiveSpaceMenu] = useState(null);
    const renameInputRef = useRef(null);

    const [chatContexts, setChatContexts] = useState({});
    const [isManageContextOpen, setIsManageContextOpen] = useState(false);
    const [managingContextFor, setManagingContextFor] = useState(null);

    const [processingPercentage, setProcessingPercentage] = useState(0);

    const handleManageContext = (chatName) => {
        setManagingContextFor(chatName);
        setIsManageContextOpen(true);
    };

    const handleSaveContext = (chatName, selectedCollections) => {
        setChatContexts(prev => ({
            ...prev,
            [chatName]: selectedCollections
        }));
        setIsManageContextOpen(false);
        setManagingContextFor(null);
    };

    useEffect(() => {
        const fetchChatHistory = async () => {
            try {
                const response = await axios.get('/api/chat_history');
                if (Object.keys(response.data).length > 0) {
                    setMessages(response.data);
                    setChatSpaces(Object.keys(response.data));
                    setActiveChatSpace(Object.keys(response.data)[0]);
                } else {
                    const defaultChatName = 'Default Chat';
                    setMessages({ [defaultChatName]: [] });
                    setChatSpaces([defaultChatName]);
                    setActiveChatSpace(defaultChatName);
                }
            } catch (error) {
                console.error('Error fetching chat history:', error);
                const defaultChatName = 'Default Chat';
                setMessages({ [defaultChatName]: [] });
                setChatSpaces([defaultChatName]);
                setActiveChatSpace(defaultChatName);
            }
        };
        fetchChatHistory();
    }, []);

    useEffect(() => {
        const checkAuthAndFetchUserInfo = async () => {
            try {
                const token = localStorage.getItem('token');
                if (token) {
                    axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
                    const authResponse = await axios.get('/api/check_auth');
                    if (authResponse.data.authenticated) {
                        setIsAuthenticated(true);
                        // Fetch user info
                        const userInfoResponse = await axios.get('/api/user-info');
                        if (userInfoResponse.data.error) {
                            setIsAuthenticated(false);
                            localStorage.removeItem('token');
                            delete axios.defaults.headers.common['Authorization'];
                            alert('Your session has expired. Please log in again.');
                            navigate('/login');
                        } else {
                            setUserInfo(userInfoResponse.data);
                        }
                    } else {
                        handleLogout();
                    }
                } else {
                    handleLogout();
                }
            } catch (error) {
                console.error('Error checking authentication or fetching user info:', error);
                handleLogout();
            }
        };
        checkAuthAndFetchUserInfo();
    }, [navigate]);

    const handleEditUserInfo = () => {
        setIsUserInfoOpen(false);
        setIsEditUserInfoOpen(true);
    };

    const handleChangeTemp = (e) => {
        setTemperature(parseFloat(e.target.value));
    };

    const handleSaveUserInfo = async (editedInfo) => {
        try {
            console.log('Sending updated user info:', editedInfo);
            const response = await axios.put('/api/update-user-info', editedInfo);
            console.log('Server response:', response.data);
            
            if (response.data.success) {
                setUserInfo(editedInfo);
                setIsEditUserInfoOpen(false);
                setIsUserInfoOpen(true);
            } else {
                console.error('Failed to update user info:', response.data.error);
                alert(`Failed to update user info: ${response.data.error || 'Unknown error'}`);
            }
        } catch (error) {
            console.error('Error updating user info:', error);
            console.error('Error response:', error.response);
            alert(`Error updating user info: ${error.response?.data?.error || error.message || 'Unknown error'}`);
        }
    };

    const handleLogout = async () => {
        try {
            await axios.post('/api/logout');
        } catch (error) {
            console.error('Error logging out:', error);
        } finally {
            setIsAuthenticated(false);
            localStorage.removeItem('token');
            delete axios.defaults.headers.common['Authorization'];
            navigate('/login');
        }
    };

    const handleManageKnowledgeBase = () => {
        navigate('/knowledge-base');
    };

    const handleGenerateUnitTests = async (prompt) => {
        setIsGeneratingUnitTests(true);
        try {
            const response = await axios.post('/api/generate_unit_tests', {
                prompt: prompt,
                model_name: isGroq ? groqModel : localModel,
                temperature: temperature,
                groq_api_token: isGroq ? groqApiToken : null
            }, {
                responseType: 'blob'
            });
            
            const blob = new Blob([response.data], { type: 'text/csv' });
            const link = document.createElement('a');
            link.href = window.URL.createObjectURL(blob);
            link.download = 'unit_tests.csv';
            link.click();
            
            setMessages(prevMessages => ({
                ...prevMessages,
                [activeChat]: [
                    ...(prevMessages[activeChat] || []),
                    { text: "Unit tests generated successfully!", isUser: false, sender: 'Bot' }
                ]
            }));
        } catch (error) {
            console.error('Error generating unit tests:', error);
            setMessages(prevMessages => ({
                ...prevMessages,
                [activeChat]: [
                    ...(prevMessages[activeChat] || []),
                    { text: `Error generating unit tests: ${error.response?.data?.error || error.message}`, isUser: false, sender: 'Bot' }
                ]
            }));
        } finally {
            setIsGeneratingUnitTests(false);
            setIsGenerateUnitTestsOpen(false);
        }
    };

    const handleGenerateAcceptanceCriteria = async (prompt) => {
        setIsGeneratingAcceptanceCriteria(true);
        try {
            const response = await axios.post('/api/generate_acceptance_criteria', {
                prompt: prompt,
                model_name: isGroq ? groqModel : localModel,
                temperature: temperature,
                groq_api_token: isGroq ? groqApiToken : null
            }, {
                responseType: 'blob'
            });
            
            const blob = new Blob([response.data], { type: 'text/csv' });
            const link = document.createElement('a');
            link.href = window.URL.createObjectURL(blob);
            link.download = 'acceptance_criteria.csv';
            link.click();
            
            setMessages(prevMessages => ({
                ...prevMessages,
                [activeChat]: [
                    ...(prevMessages[activeChat] || []),
                    { text: "Acceptance criteria generated successfully!", isUser: false, sender: 'Bot' }
                ]
            }));
        } catch (error) {
            console.error('Error generating acceptance criteria:', error);
            setMessages(prevMessages => ({
                ...prevMessages,
                [activeChat]: [
                    ...(prevMessages[activeChat] || []),
                    { text: `Error generating acceptance criteria: ${error.response?.data?.error || error.message}`, isUser: false, sender: 'Bot' }
                ]
            }));
        } finally {
            setIsGeneratingAcceptanceCriteria(false);
            setIsGenerateAcceptanceCriteriaOpen(false);
        }
    };   

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages]);

    const toggleCategory = (index) => {
        setActiveCategory(activeCategory === index ? null : index);
    };

    const handleSend = async () => {
        if (message.trim()) {
            setMessages(prevMessages => ({
                ...prevMessages,
                [activeChatSpace]: [
                    ...(prevMessages[activeChatSpace] || []),
                    { text: message, isUser: true, sender: 'You' }
                ]
            }));
            setMessage('');
    
            try {
                const selectedCollections = chatContexts[activeChatSpace] || [];
                console.log("Selected collections for chat:", selectedCollections);
                
                const requestData = {
                    question: message,
                    model_name: isGroq ? groqModel : localModel,
                    temperature: temperature,
                    groq_api_token: isGroq ? groqApiToken : null,
                    chatName: activeChatSpace,
                    collections: selectedCollections.length > 0 ? selectedCollections : 'all'
                };
                console.log("Sending request to backend:", requestData);
    
                const response = await axios.post('/api/chat', requestData);
    
                console.log("Response from backend:", response.data);
    
                const botMessage = {
                    text: response.data.answer,
                    sources: response.data.source_documents || [],
                    isUser: false,
                    sender: 'Bot'
                };
    
                setMessages(prevMessages => ({
                    ...prevMessages,
                    [activeChatSpace]: [
                        ...(prevMessages[activeChatSpace] || []),
                        botMessage
                    ]
                }));
            } catch (error) {
                console.error('Error sending message:', error);
                let errorMessage = "Sorry, there was an error processing your request.";
                if (error.response && error.response.data && error.response.data.error) {
                    errorMessage = error.response.data.error;
                }
                setMessages(prevMessages => ({
                    ...prevMessages,
                    [activeChatSpace]: [
                        ...(prevMessages[activeChatSpace] || []),
                        { text: errorMessage, isUser: false, sender: 'Bot' }
                    ]
                }));
            }
        }
    };

    const handleRenameSpace = async (oldName, newName) => {
        if (newName.trim() !== '' && oldName !== newName) {
            try {
                await axios.post('/api/rename_chat_space', { old_name: oldName, new_name: newName });
                setChatSpaces(prevSpaces => 
                    prevSpaces.map(space => 
                        space === oldName ? newName : space
                    )
                );
                setMessages(prevMessages => ({
                    ...prevMessages,
                    [newName]: prevMessages[oldName]
                }));
                if (activeChatSpace === oldName) {
                    setActiveChatSpace(newName);
                }
                // Update chatContexts if necessary
                setChatContexts(prev => {
                    const { [oldName]: oldContext, ...rest } = prev;
                    return {
                        ...rest,
                        [newName]: oldContext
                    };
                });
            } catch (error) {
                console.error('Error renaming chat space:', error);
            }
        }
    };

    const handleDeleteSpace = async (chatName) => {
        if (chatSpaces.length <= 1) {
            alert("Cannot delete the only chat space");
            return;
        }

        if (window.confirm(`Are you sure you want to delete the chat space "${chatName}"?`)) {
            try {
                const response = await axios.post('/api/delete_chat_space', { chat_name: chatName });
                if (response.data.success) {
                    setChatSpaces(prevSpaces => prevSpaces.filter(space => space !== chatName));
                    setMessages(prevMessages => {
                        const { [chatName]: deletedSpace, ...remainingSpaces } = prevMessages;
                        return remainingSpaces;
                    });
                    if (activeChatSpace === chatName) {
                        setActiveChatSpace(chatSpaces[0]);
                    }
                } else {
                    console.error('Error deleting chat space:', response.data.error);
                    alert(response.data.error);
                }
            } catch (error) {
                console.error('Error deleting chat space:', error);
                alert('An error occurred while deleting the chat space');
            }
        }
        setActiveSpaceMenu(null);
    };

    const handleDeleteAllChatHistory = async () => {
        try {
            const response = await axios.post('/api/delete_all_chat_history');
            if (response.data.success) {
                setMessages({ "Default Chat": [] });
                setChatSpaces(["Default Chat"]);
                setActiveChatSpace("Default Chat");
                setIsUserInfoOpen(false); 
            } else {
                console.error('Error deleting all chat history:', response.data.error);
                alert(response.data.error);
            }
        } catch (error) {
            console.error('Error deleting all chat history:', error);
            alert('An error occurred while deleting all chat history');
        }
    };

    const createNewChatSpace = () => {
        const newChatName = `New Chat ${chatSpaces.length + 1}`;
        setChatSpaces(prevSpaces => [...prevSpaces, newChatName]);
        setActiveChatSpace(newChatName);
        setMessages(prevMessages => ({
            ...prevMessages,
            [newChatName]: []
        }));
        setIsSpaceMenuOpen(false);
    };

    useEffect(() => {
        if (isRenaming && renameInputRef.current) {
            renameInputRef.current.focus();
        }
    }, [isRenaming]);

    const handleProcessData = async (processFunction, data) => {
        setIsProcessing(true);
        setProcessingPercentage(0);
    
        try {
            // Start the processing task and get the processId
            const response = await processFunction(data);
            
            // Check if the response contains the processId
            const processId = response.data.processId;
            if (!processId) {
                throw new Error('Process ID is undefined');
            }
    
            // Poll for progress
            const interval = setInterval(async () => {
                try {
                    const progressResponse = await axios.get(`/api/get_progress/${processId}`);
                    const percentage = progressResponse.data.percentage;
    
                    if (percentage >= 100) {
                        clearInterval(interval);
                        setProcessingPercentage(100); // Ensure progress completes
                    } else {
                        setProcessingPercentage(percentage);
                    }
                } catch (error) {
                    clearInterval(interval);
                    console.error('Error fetching progress:', error);
                }
            }, 500); // Adjust interval as needed
    
            setMessages(prevMessages => ({
                ...prevMessages,
                [activeChat]: [
                    ...(prevMessages[activeChat] || []),
                    { text: "Data processed and stored successfully!", isUser: false, sender: 'Bot' }
                ]
            }));
        } catch (error) {
            console.error('Error processing data:', error);
            setMessages(prevMessages => ({
                ...prevMessages,
                [activeChat]: [
                    ...(prevMessages[activeChat] || []),
                    { text: "Error processing data. Please try again.", isUser: false, sender: 'Bot' }
                ]
            }));
        }
    
        setTimeout(() => {
            setIsProcessing(false);
            setProcessingPercentage(0);
        }, 500); // Delay to show 100% completion before hiding overlay
    };
    

    const handleProcessPdf = () => {
        if (!pdfFile) return;
        const formData = new FormData();
        formData.append('file', pdfFile);
        handleProcessData(
            (data) => axios.post('/api/process_pdf', data, {
                headers: { 'Content-Type': 'multipart/form-data' }
            }),
            formData
        );
    };


    const categories = [
        {
            name: 'Modèles',
            icon: Settings ,
            content: (
                <>
                    <div className="mb-4">
                        <label className="block text-sm font-medium text-white mb-2">Choose</label>
                        <div className="flex items-center space-x-4">
                            <label className="inline-flex items-center">
                                <input
                                    type="radio"
                                    className="form-radio text-orange-600"
                                    name="modelType"
                                    value="local"
                                    checked={!isGroq}
                                    onChange={() => setIsGroq(false)}
                                />
                                <span className="ml-2 text-white">Local</span>
                            </label>
                            <label className="inline-flex items-center">
                                <input
                                    type="radio"
                                    className="form-radio text-orange-600"
                                    name="modelType"
                                    value="groq"
                                    checked={isGroq}
                                    onChange={() => setIsGroq(true)}
                                />
                                <span className="ml-2 text-white">Groq</span>
                            </label>
                        </div>
                    </div>
                    {isGroq && (
                        <div className="mb-4">
                            <label className="block text-sm font-medium text-white mb-2">Groq API Token</label>
                            <input
                                type="password"
                                value={groqApiToken}
                                onChange={(e) => setGroqApiToken(e.target.value)}
                                className="w-full px-3 py-2 bg-darkred-900 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-darkred-900"
                            />
                        </div>
                    )}
                    <div className="mb-4">
                        <label className="block text-sm font-medium text-white mb-2">Model</label>
                        <select
                            value={isGroq ? groqModel : localModel}
                            onChange={(e) => isGroq ? setGroqModel(e.target.value) : setLocalModel(e.target.value)}
                            className="w-full px-3 py-2 bg-darkred-900 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-darkred-900"
                        >
                            {isGroq ? (
                                <>
                                    <option value="llama3-8b-8192">Llama 3 (8b-8192)</option>
                                    <option value="llama-3.1-8b-instant">Llama 3.1 (8b)</option>
                                    <option value="gemma2-9b-it">Gemma 2 (9b-it)</option>
                                    <option value="mixtral-8x7b-32768">Mixtral (8x7b-32768)</option>
                                </>
                            ) : (
                                <>
                                    <option value="llama3">Llama 3</option>
                                    <option value="gemma2:9b">Gemma 2 (9b)</option>
                                    <option value="codegemma:7b">Code Gemma (7b)</option>
                                </>
                            )}
                        </select>
                    </div>
                    <div className="mb-4">
                        <div className="flex justify-between items-center mb-2">
                            <label className="text-sm font-medium text-gray-300 flex items-center">
                                Temperature
                            </label>
                            <span className="text-white bg-darkred-900 px-2 py-1 rounded-md text-sm">
                            {temperature.toFixed(2)}
                            </span>
                        </div>
                        <div className="relative pt-1">
                            <input
                            type="range"
                            min="0"
                            max="1"
                            step="0.01"
                            value={temperature}
                            onChange={handleChangeTemp}
                            className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer"
                            style={{
                                background: `linear-gradient(to right, #3B82F6 0%, #3B82F6 ${temperature * 100}%, #4B5563 ${temperature * 100}%, #4B5563 100%)`,
                            }}
                            />
                            <div className="flex justify-between text-xs text-gray-400 mt-2">
                            <span className="flex items-center">
                                Precise
                            </span>
                            <span className="flex items-center">
                                Creative 
                            </span>
                            </div>
                        </div>
                    </div>
                </>
            )
        },
        {
            name: 'PDF Document',
            icon: FaFilePdf,
            content: (
                <>
                    <div className="mb-4">
                        <label className="block text-sm font-medium text-gray-300 mb-2">Upload PDF</label>
                        <input
                            type="file"
                            accept=".pdf"
                            onChange={(e) => setPdfFile(e.target.files[0])}
                            className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
                        />
                    </div>
                    <button
                        onClick={handleProcessPdf}
                        className="w-full bg-orange-600 text-white rounded-lg py-2 px-4 hover:bg-orange-700 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-opacity-50"
                    >
                        Process PDF Document
                    </button>
                </>
            )
        },
    ];


    return (
        <div className="flex h-screen bg-gray-800">
            {/* Sidebar */}
            <AnimatePresence>
                {isSidebarOpen && (
                    <motion.div
                        initial={{ x: '-100%' }}
                        animate={{ x: 0 }}
                        exit={{ x: '-100%' }}
                        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                        className="w-80 bg-darkred-800 text-white p-4 fixed left-0 top-0 h-full z-30 overflow-y-auto flex flex-col justify-between"
                    >
                        <div>
                            <div className="flex justify-between items-center mb-6">
                            <div className="flex items-center space-x-4">
                                <img src="/image/logo_d.png" className="w-24 h-12 ml-5" alt="Logo" />
                            </div>
                                <button onClick={() => setIsSidebarOpen(false)} className="md:hidden text-gray-400 hover:text-white">
                                    <X size={24} />
                                </button>
                            </div>
                            {categories.map((category, index) => (
                                <SidebarCategory
                                    key={index}
                                    category={category}
                                    isActive={activeCategory === index}
                                    toggleCategory={() => toggleCategory(index)}
                                >
                                    {category.content}
                                </SidebarCategory>
                            ))}
                        </div>
                        <div>
                            <SidebarItem 
                            icon={Database} 
                            text="Manage your Knowledge Base"
                            onClick={handleManageKnowledgeBase}
                            />
                            <SidebarItem 
                                icon={LogOut} 
                                text="Logout" 
                                onClick={handleLogout} 
                            />
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>


            {/* Main chat area */}
            <div className={`flex-1 flex flex-col w-full ${isSidebarOpen ? 'md:ml-80' : ''} transition-all duration-300`}>
                <div className="bg-white shadow-sm p-4 flex items-center justify-between">
                    <div className="relative flex items-center">
                        <motion.button
                            whileHover={{ scale: 1.1 }}
                            whileTap={{ scale: 0.9 }}
                            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                            className="mr-3 text-gray-600 hover:text-gray-800 focus:outline-none"
                        >
                            <Menu size={24} />
                        </motion.button>
                        <div 
                            className="flex items-center cursor-pointer bg-gray-100 rounded-lg px-3 py-2 hover:bg-gray-200 transition-colors duration-200"
                            onClick={() => setIsSpaceMenuOpen(!isSpaceMenuOpen)}
                        >
                            <h2 className="text-lg font-semibold text-gray-800 mr-2">{activeChatSpace}</h2>
                            <motion.div
                                animate={{ rotate: isSpaceMenuOpen ? 180 : 0 }}
                                transition={{ duration: 0.3 }}
                            >
                                <ChevronDown size={20} className="text-gray-500" />
                            </motion.div>
                        </div>
                        <AnimatePresence>
                            {isSpaceMenuOpen && (
                                <motion.div
                                    initial={{ opacity: 0, y: -10, scale: 0.95 }}
                                    animate={{ opacity: 1, y: 0, scale: 1 }}
                                    exit={{ opacity: 0, y: -10, scale: 0.95 }}
                                    transition={{ duration: 0.2 }}
                                    className="absolute top-full left-0 mt-2 w-64 bg-white rounded-lg shadow-lg z-10 overflow-hidden"
                                >
                                    <div className="py-2">
                                    {chatSpaces.map((chatName, index) => (
                                            <motion.div 
                                                key={chatName}
                                                initial={{ opacity: 0, y: -10 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                transition={{ delay: index * 0.05 }}
                                                className="relative"
                                            >
                                                <div className="flex items-center justify-between px-4 py-2 hover:bg-gray-50">
                                                    <div className="flex flex-col">
                                                        <button
                                                            onClick={() => { setActiveChatSpace(chatName); setIsSpaceMenuOpen(false); }}
                                                            className={`text-left text-sm ${
                                                                activeChatSpace === chatName ? 'font-semibold text-blue-600' : 'text-gray-700'
                                                            }`}
                                                        >
                                                            {chatName}
                                                        </button>
                                                        <span className="text-xs text-gray-500">
                                                            {chatContexts[chatName] && chatContexts[chatName].length > 0
                                                                ? `Context: ${chatContexts[chatName].join(', ')}`
                                                                : 'All collections'}
                                                        </span>
                                                    </div>
                                                    <motion.button
                                                        whileHover={{ scale: 1.1 }}
                                                        whileTap={{ scale: 0.9 }}
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            setActiveSpaceMenu(chatName);
                                                        }}
                                                        className="text-gray-400 hover:text-blue-600 focus:outline-none"
                                                    >
                                                        <MoreVertical size={16} />
                                                    </motion.button>
                                                </div>
                                                <AnimatePresence>
                                                    {activeSpaceMenu === chatName && (
                                                        <ChatSpaceSettingsMenu 
                                                            chatName={chatName}
                                                            onClose={() => setActiveSpaceMenu(null)}
                                                            onRename={handleRenameSpace}
                                                            onDelete={handleDeleteSpace}
                                                            onManageContext={handleManageContext}
                                                            collections={['PDF Document', 'Confluence Space', 'Jira Project', 'GitHub Repository', 'GitLab Repository']}
                                                            selectedCollections={chatContexts[chatName] || []}
                                                            onSave={(chatName, selectedCollections) => {
                                                                setChatContexts(prev => ({
                                                                    ...prev,
                                                                    [chatName]: selectedCollections
                                                                }));
                                                            }}
                                                        />
                                                    )}
                                                </AnimatePresence>
                                            </motion.div>
                                        ))}
                                        <motion.button
                                            whileHover={{ scale: 1.02 }}
                                            whileTap={{ scale: 0.98 }}
                                            onClick={createNewChatSpace}
                                            className="block w-full text-left px-4 py-2 text-sm text-blue-600 hover:bg-blue-50 transition-colors duration-200"
                                        >
                                            <PlusCircle size={18} className="inline mr-2" />
                                            New Chat Space
                                        </motion.button>
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>
                    <motion.div
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.9 }}
                        className="relative"
                    >
                        <User 
                            size={24} 
                            className="text-gray-600 hover:text-gray-800 cursor-pointer" 
                            onClick={() => setIsUserInfoOpen(!isUserInfoOpen)}
                        />
                    </motion.div>
                </div>

                {/* Messages area */}
                <div className="flex-grow overflow-y-auto p-4 bg-gray-50">
                    <AnimatePresence>
                        {(messages[activeChatSpace] || []).map((msg, index) => (
                            <ChatMessage key={index} message={msg} isUser={msg.isUser} sender={msg.sender} />
                        ))}
                    </AnimatePresence>
                    <div ref={messagesEndRef} />
                </div>


                {/* Input area */}
                <div className="bg-white p-4 border-t border-gray-200">
                    <div className="flex items-end bg-gray-100 rounded-lg">
                    <motion.button
                            whileHover={{ scale: 1.1 }}
                            whileTap={{ scale: 0.9 }}
                            onClick={handleSend}
                            className="bg-white-500 text-darkblue p-2 m-1 hover:bg-darkred-800 hover:text-white transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-darkred-800 focus:ring-opacity-50"
                        >
                            <Upload size={18} />
                        </motion.button>
                        <textarea
                            ref={textareaRef}
                            placeholder="Entrer votre message..."
                            className="flex-1 bg-transparent px-4 py-2 outline-none resize-none min-h-[40px] max-h-[200px] text-md text-gray-800"
                            value={message}
                            onChange={(e) => setMessage(e.target.value)}
                            onKeyPress={(e) => e.key === 'Enter' && !e.shiftKey && (e.preventDefault(), handleSend())}
                            rows={1}
                        />
                            <motion.button
                            whileHover={{ scale: 1.1 }}
                            whileTap={{ scale: 0.9 }}
                            onClick={handleSend}
                            className="bg-white-500 text-darkblue p-2 m-1 hover:bg-darkred-800 hover:text-white transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-darkred-800 focus:ring-opacity-50"
                        >
                            <Settings size={18} />
                        </motion.button>
                        <motion.button
                            whileHover={{ scale: 1.1 }}
                            whileTap={{ scale: 0.9 }}
                            onClick={handleSend}
                            className="bg-white-500 text-darkblue p-2 m-1 hover:bg-darkred-800 hover:text-white transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-darkred-800 focus:ring-opacity-50"
                        >
                            <Send size={18} />
                        </motion.button>
                    </div>
                </div>
            </div>

            {/* Renaming modal */}
            {isRenaming && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white p-6 rounded-lg shadow-xl">
                        <h3 className="text-lg font-semibold mb-4">Rename Chat Space</h3>
                        <input
                            ref={renameInputRef}
                            type="text"
                            value={newSpaceName}
                            onChange={(e) => setNewSpaceName(e.target.value)}
                            className="border border-gray-300 rounded px-3 py-2 w-full mb-4"
                        />
                        <div className="flex justify-end space-x-2">
                            <button
                                onClick={() => handleRenameSpace(activeChatSpace, newSpaceName)}
                                className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
                            >
                                Rename
                            </button>
                            <button
                                onClick={() => setIsRenaming(false)}
                                className="bg-gray-300 text-gray-800 px-4 py-2 rounded hover:bg-gray-400"
                            >
                                Cancel
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Processing overlay */}
            <AnimatePresence>
                {isProcessing && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 backdrop-blur-sm"
                    >
                        <div className="bg-white p-8 rounded-lg shadow-xl flex flex-col items-center">
                            <h2 className="text-2xl font-semibold mb-4 text-center">Processing...</h2>
                            <div className="loader ease-linear rounded-full border-8 border-t-8 border-gray-200 h-24 w-24 mb-4"></div>
                            <p className="text-gray-500 text-center mb-4">Please wait while we process your request...</p>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Data Processor Windows */}
            <PdfProcessor
                isOpen={isPdfOpen}
                onClose={() => setIsPdfOpen(false)}
                onProcess={handleProcessPdf}
                modelName={isGroq ? 'groq' : localModel}
                temperature={temperature}
                groqApiToken={isGroq ? groqApiToken : null}
            />
           <GenerateUnitTestsModal
                isOpen={isGenerateUnitTestsOpen}
                onClose={() => setIsGenerateUnitTestsOpen(false)}
                onGenerate={handleGenerateUnitTests}
                isProcessing={isGeneratingUnitTests}
            />
            <GenerateAcceptanceCriteriaModal
                isOpen={isGenerateAcceptanceCriteriaOpen}
                onClose={() => setIsGenerateAcceptanceCriteriaOpen(false)}
                onGenerate={handleGenerateAcceptanceCriteria}
                isProcessing={isGeneratingAcceptanceCriteria}
            />
            <EditUserInfoModal 
                isOpen={isEditUserInfoOpen}
                onClose={() => setIsEditUserInfoOpen(false)}
                userInfo={userInfo}
                onSave={handleSaveUserInfo}
            />
            <UserInfoModal 
                isOpen={isUserInfoOpen}
                onClose={() => setIsUserInfoOpen(false)}
                userInfo={userInfo}
                onLogout={handleLogout}
                onEdit={handleEditUserInfo}
            />
            <UserInfoModal 
                isOpen={isUserInfoOpen}
                onClose={() => setIsUserInfoOpen(false)}
                userInfo={userInfo}
                onLogout={handleLogout}
                onEdit={handleEditUserInfo}
                onDeleteAllChatHistory={handleDeleteAllChatHistory}
            />
            <ManageContextModal
                isOpen={isManageContextOpen}
                onClose={() => {
                    setIsManageContextOpen(false);
                    setManagingContextFor(null);
                }}
                chatName={managingContextFor || ''}
                collections={['PDF Document', 'Confluence Space', 'Jira Project', 'GitHub Repository', 'GitLab Repository']}
                selectedCollections={managingContextFor ? (chatContexts[managingContextFor] || []) : []}
                onSave={handleSaveContext}
            />
        </div>
    );
}