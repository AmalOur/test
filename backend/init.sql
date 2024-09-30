create extension vector;

create table public.langchain_pg_collection
(
    name      varchar,
    cmetadata json,
    uuid      uuid not null
        primary key,
    username  varchar(255)
);
 
alter table public.langchain_pg_collection
    owner to postgres;
 
create table public.langchain_pg_embedding
(
    collection_id uuid
        references public.langchain_pg_collection
            on delete cascade,
    embedding     vector,
    document      varchar,
    cmetadata     json,
    custom_id     varchar,
    uuid          uuid not null
        primary key,
    username      varchar(255)
);
 
alter table public.langchain_pg_embedding
    owner to postgres;
    
CREATE TABLE IF NOT EXISTS public.chat (
    id SERIAL PRIMARY KEY,
    username VARCHAR(255) NOT NULL,
    chat_name VARCHAR(255) NOT NULL,
    message_text TEXT NOT NULL,
    is_user BOOLEAN NOT NULL,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);