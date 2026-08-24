-- Faz 18 devamı: "Fikirden doğan proje" akışı. Proje oluşturmanın ana yolu
-- artık boş bir form değil, olgunlaşmış bir fikri terfi ettirmek: kullanıcı
-- fikrin detayında "Projeye Dönüştür" der, proje o fikirden tohumlanarak
-- (ad/açıklama/problem/hedef kitle fikrin güncel versiyonundan kopyalanarak)
-- oluşur ve kaynak fikir o projenin ilk fikri olarak panoda kalır.
--
-- Aha!/Productboard/Jira Product Discovery'deki "promote" deseni: fikir
-- kaybolmaz, terfi eder ve iki kayıt arasındaki bağ korunur.

-- Projenin hangi fikirden doğduğu. Ayarlar'dan doğrudan oluşturulan
-- projelerde NULL kalır. Bir projenin en fazla bir çıkış fikri olduğu için
-- bayrak ideas'ta değil burada duruyor (doğal 1:1).
ALTER TABLE projects
  ADD COLUMN origin_idea_id uuid NULL REFERENCES ideas(id) ON DELETE SET NULL;

CREATE INDEX idx_projects_origin_idea ON projects(origin_idea_id);

-- =========================================================
-- convert_idea_to_project: fikri projeye terfi ettirir.
-- set_idea_project ile aynı yetki seviyesi (is_workspace_contributor) —
-- proje oluşturmak yönetici ayrıcalığı değil, üyeler de dönüştürebilir.
-- =========================================================
CREATE OR REPLACE FUNCTION public.convert_idea_to_project(_idea_id uuid)
RETURNS projects
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_project projects;
  v_workspace_id uuid;
  v_project_id uuid;
  v_current_version int;
  v_title varchar(255);
  v_content text;
  v_problem_statement text;
  v_target_audience text;
BEGIN
  SELECT workspace_id, project_id, current_version
  INTO v_workspace_id, v_project_id, v_current_version
  FROM ideas
  WHERE id = _idea_id AND deleted_at IS NULL;

  IF v_workspace_id IS NULL THEN
    RAISE EXCEPTION 'idea not found';
  END IF;

  IF NOT is_workspace_contributor(v_workspace_id) THEN
    RAISE EXCEPTION 'permission_denied: only contributors can convert an idea to a project';
  END IF;

  -- Daha spesifik olan "zaten terfi etmiş" durumu önce kontrol edilir;
  -- terfi eden fikrin project_id'si de dolduğu için sıra tersine dönerse
  -- kullanıcı yanıltıcı bir mesaj görür.
  IF EXISTS (
    SELECT 1 FROM projects
    WHERE origin_idea_id = _idea_id AND deleted_at IS NULL
  ) THEN
    RAISE EXCEPTION 'already_promoted';
  END IF;

  -- Bir özellik fikri (başka bir projeye bağlı) projeye terfi edemez.
  IF v_project_id IS NOT NULL THEN
    RAISE EXCEPTION 'already_linked';
  END IF;

  SELECT title, content, problem_statement, target_audience
  INTO v_title, v_content, v_problem_statement, v_target_audience
  FROM idea_versions
  WHERE idea_id = _idea_id AND version_number = v_current_version;

  -- projects.name varchar(100), idea_versions.title varchar(255) —
  -- kısaltılır; ad proje detay ekranından düzenlenebilir.
  INSERT INTO projects (
    workspace_id, name, description, problem_statement, target_audience,
    created_by, origin_idea_id
  )
  VALUES (
    v_workspace_id, left(v_title, 100), v_content, v_problem_statement,
    v_target_audience, auth.uid(), _idea_id
  )
  RETURNING * INTO new_project;

  -- Kaynak fikir panoda kalır ve yeni projenin ilk fikri olur.
  UPDATE ideas SET project_id = new_project.id WHERE id = _idea_id;

  RETURN new_project;
END;
$$;

GRANT EXECUTE ON FUNCTION public.convert_idea_to_project(uuid) TO authenticated;
