-- Eklentileri Etkinleştir
-- Not: UUID üretimi için uuid-ossp yerine Postgres'e gömülü gen_random_uuid()
-- kullanılıyor (Postgres 13+'ta hiçbir extension gerektirmez). uuid-ossp,
-- Supabase Cloud'da fonksiyonlarını "extensions" şemasına kurduğundan ve
-- migration'lar search_path'e bu şemayı eklemediğinden "function
-- uuid_generate_v4() does not exist" hatasına yol açıyordu.
CREATE EXTENSION IF NOT EXISTS "vector";

-- Enum Tipleri
CREATE TYPE status_type AS ENUM ('DRAFT', 'IN_REVIEW', 'APPROVED', 'CANCELLED', 'DONE');
CREATE TYPE impact_effort_level AS ENUM ('LOW', 'MEDIUM', 'HIGH');

-- 1. Workspaces Tablosu
CREATE TABLE workspaces (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title VARCHAR(255) NOT NULL,
    invite_code VARCHAR(50) UNIQUE NOT NULL DEFAULT substring(md5(random()::text) from 1 for 10),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. Workspace Members Tablosu (MVP'de düz erişim modeli, karmaşık RBAC yok)
CREATE TABLE workspace_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    joined_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(workspace_id, user_id)
);

-- 3. Kanban Columns Tablosu
CREATE TABLE kanban_columns (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    title VARCHAR(100) NOT NULL,
    status_type status_type NOT NULL DEFAULT 'DRAFT',
    "order" INT NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 4. Ideas Tablosu (Aktif Durum)
CREATE TABLE ideas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    column_id UUID NOT NULL REFERENCES kanban_columns(id) ON DELETE RESTRICT,
    current_version INT NOT NULL DEFAULT 1,
    cancellation_reason TEXT NULL,
    created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 5. Idea Versions Tablosu (Geçmiş / Versiyonlama / Snapshot Kayıtları)
CREATE TABLE idea_versions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    idea_id UUID NOT NULL REFERENCES ideas(id) ON DELETE CASCADE,
    version_number INT NOT NULL,
    title VARCHAR(255) NOT NULL,
    content JSONB NOT NULL, -- Tiptap formatında zengin metin içeriği
    problem_statement TEXT NULL,
    target_audience TEXT NULL,
    impact_score impact_effort_level DEFAULT 'MEDIUM',
    effort_score impact_effort_level DEFAULT 'MEDIUM',
    created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(idea_id, version_number)
);

-- 6. Comments Tablosu
CREATE TABLE comments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    idea_id UUID NOT NULL REFERENCES ideas(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 7. Board Templates Tablosu
CREATE TABLE board_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title VARCHAR(100) NOT NULL,
    columns_config JSONB NOT NULL, -- [{ title: string, status_type: status_type }] yapısında dizi
    is_system BOOLEAN NOT NULL DEFAULT false,
    user_id UUID NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 8. Notifications Tablosu
CREATE TABLE notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    actor_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    idea_id UUID NOT NULL REFERENCES ideas(id) ON DELETE CASCADE,
    message TEXT NOT NULL,
    is_read BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- İndeksler (Performans)
CREATE INDEX idx_workspace_members_user ON workspace_members(user_id);
CREATE INDEX idx_kanban_columns_workspace_order ON kanban_columns(workspace_id, "order");
CREATE INDEX idx_ideas_workspace_column ON ideas(workspace_id, column_id);
CREATE INDEX idx_idea_versions_idea ON idea_versions(idea_id, version_number DESC);
CREATE INDEX idx_comments_idea_created ON comments(idea_id, created_at);
CREATE INDEX idx_notifications_user_unread ON notifications(user_id, is_read, created_at DESC);
