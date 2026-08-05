-- roles
CREATE TYPE public.app_role AS ENUM ('admin', 'user');

CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view their own roles" ON public.user_roles FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

-- shows
CREATE TABLE public.shows (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  city text NOT NULL,
  venue text NOT NULL,
  date_label text NOT NULL,
  day_label text NOT NULL DEFAULT '',
  status text NOT NULL DEFAULT 'Билеты есть',
  ticket_url text NOT NULL DEFAULT '',
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.shows TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.shows TO authenticated;
GRANT ALL ON public.shows TO service_role;
ALTER TABLE public.shows ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Shows are viewable by everyone" ON public.shows FOR SELECT USING (true);
CREATE POLICY "Admins manage shows" ON public.shows FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE TRIGGER shows_updated_at BEFORE UPDATE ON public.shows FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- faq
CREATE TABLE public.faq_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  question text NOT NULL,
  answer text NOT NULL,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.faq_items TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.faq_items TO authenticated;
GRANT ALL ON public.faq_items TO service_role;
ALTER TABLE public.faq_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "FAQ viewable by everyone" ON public.faq_items FOR SELECT USING (true);
CREATE POLICY "Admins manage faq" ON public.faq_items FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE TRIGGER faq_updated_at BEFORE UPDATE ON public.faq_items FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- socials
CREATE TABLE public.social_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  label text NOT NULL,
  url text NOT NULL DEFAULT '#',
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.social_links TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.social_links TO authenticated;
GRANT ALL ON public.social_links TO service_role;
ALTER TABLE public.social_links ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Socials viewable by everyone" ON public.social_links FOR SELECT USING (true);
CREATE POLICY "Admins manage socials" ON public.social_links FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE TRIGGER socials_updated_at BEFORE UPDATE ON public.social_links FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- content
CREATE TABLE public.site_content (
  key text PRIMARY KEY,
  value text NOT NULL DEFAULT '',
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.site_content TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.site_content TO authenticated;
GRANT ALL ON public.site_content TO service_role;
ALTER TABLE public.site_content ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Content viewable by everyone" ON public.site_content FOR SELECT USING (true);
CREATE POLICY "Admins manage content" ON public.site_content FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE TRIGGER content_updated_at BEFORE UPDATE ON public.site_content FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- seed shows
INSERT INTO public.shows (city, venue, date_label, day_label, status, sort_order) VALUES
('Москва','VK Stadium','12.03','ЧТ','Мало билетов',1),
('Санкт-Петербург','А2 Green Concert','15.03','ВС','Билеты есть',2),
('Казань','Cyber Arena','21.03','СБ','Билеты есть',3),
('Екатеринбург','Tele-Club','27.03','ПТ','Sold out',4),
('Новосибирск','Podzemka','04.04','СБ','Билеты есть',5),
('Краснодар','Arena Hall','10.04','ПТ','Мало билетов',6),
('Нижний Новгород','Milo Concert Hall','18.04','СБ','Билеты есть',7),
('Сочи','Mzura Hall','25.04','СБ','Билеты есть',8);

INSERT INTO public.faq_items (question, answer, sort_order) VALUES
('Как купить билет?','Выберите город в разделе «Города тура» и нажмите «Купить билет». Вы перейдёте на страницу официального билетного оператора, где сможете выбрать сектор и оплатить заказ картой. Электронный билет придёт на почту сразу после оплаты.',1),
('Возрастные ограничения','Концерты тура проходят с маркировкой 16+. Посетители до 16 лет допускаются только в сопровождении взрослых. На входе может потребоваться документ, подтверждающий возраст.',2),
('Возврат билетов','Возврат осуществляется через билетного оператора, у которого была совершена покупка, в соответствии с правилами возврата и действующим законодательством. При переносе или отмене концерта билеты действительны на новую дату либо возвращаются в полном объёме.',3),
('Во сколько начинается концерт','Двери площадок открываются за два часа до начала шоу. Основное выступление стартует в 20:00 по местному времени. Точное расписание конкретной площадки указывается в электронном билете.',4);

INSERT INTO public.social_links (label, url, sort_order) VALUES
('Telegram','#',1),('VK','#',2),('YouTube','#',3),('Instagram','#',4),('TikTok','#',5);

INSERT INTO public.site_content (key, value) VALUES
('hero_artist','SCIRENA'),
('hero_title_line1','УЕЗЖАЕМ'),
('hero_title_line2','ОСТАЁМСЯ?'),
('hero_tour_label','ТУР 2026'),
('hero_note','«Новый концертный тур SCIRENA»'),
('bio_p1','SCIRENA — российская певица нового поколения, чей стиль объединяет современный поп, R&B и атмосферную электронную музыку. Её песни наполнены личными переживаниями, искренними эмоциями и кинематографичным звучанием, благодаря чему находят отклик у тысяч слушателей.'),
('bio_p2','Музыка SCIRENA рассказывает истории о любви, расставаниях, взрослении, поиске себя и внутренней свободе. Каждая композиция становится отдельной главой большой истории, а живые выступления превращаются в эмоциональное путешествие, где зритель чувствует себя частью происходящего.'),
('bio_p3','За последние годы артистка собрала преданную аудиторию по всей России. Её концерты отличаются живым звучанием, сильной визуальной составляющей и особой атмосферой, которая остаётся со зрителями ещё долго после окончания шоу.'),
('bio_p4','Тур «УЕЗЖАЕМ ОСТАЁМСЯ?» — это новая глава творчества SCIRENA, объединяющая музыку, свет, эмоции и истории в единое концертное путешествие.'),
('quote','«Каждый концерт — это история, которую мы проживаем вместе.»'),
('privacy_url','#');