-- --------------------------------------------------------------------------------
-- 🚨 장소(places) DB 생성 및 초기 데이터 설정 🚨
-- --------------------------------------------------------------------------------

-- 기존 테이블이 있다면 삭제 후 재생성 (요청에 따라 초기화)
DROP TABLE IF EXISTS public.places;

CREATE TABLE public.places (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    country TEXT NOT NULL,
    name TEXT NOT NULL,
    type TEXT,
    address TEXT NOT NULL,
    kakao_map_url TEXT,
    naver_map_url TEXT,
    google_map_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- RLS 활성화
ALTER TABLE public.places ENABLE ROW LEVEL SECURITY;

-- 정책 생성 (조회: 누구나, 삽입/수정/삭제: 관리자)
CREATE POLICY "select_places" ON public.places FOR SELECT USING (true);
CREATE POLICY "modify_places" ON public.places FOR ALL USING (public.is_admin());

-- 초기 데이터 입력
INSERT INTO public.places (country, name, type, address) VALUES
('대한민국', '클럽 보니따 (Club Bonita)', '클럽/바', '서울 마포구 동교로 191 지하 1층'),
('대한민국', '라틴 오피셜 강남', '클럽', '서울 강남구 테헤란로 6길 9'),
('대한민국', '홍턴 (Hongturn)', '클럽', '서울 마포구 동교로 207 지하 1층'),
('대한민국', '라밤바 (La Bamba)', '펍/바', '서울 마포구 와우산로 19길 5'),
('대한민국', '마콘도 (Macondo)', '바', '서울 마포구 홍대입구역 8번 출구 인근 (2차바 전용)'),
('대한민국', '하바나 (Havana)', '클럽', '서울 마포구 어울마당로 53 지하 1층'),
('대한민국', '부에나 (Buena)', '바', '서울 마포구 동교로 217 LJ빌딩'),
('대한민국', '안단테 (Andante)', '학원/바', '서울 마포구 서교동 395-5 선진빌딩 지하 1층'),
('대한민국', '펠리스 (구 텐션)', '바', '서울 마포구 홍대입구역 2번 출구 인근'),
('대한민국', 'SOL 바', '바', '서울 마포구 동교동 166-5번지'),
('대한민국', '루에다 라틴 댄스 아카데미', '학원/클럽', '부산 부산진구 서면로 42'),
('대한민국', 'SBKZ 스텝 스튜디오', '학원', '전북 전주시 덕진구 기린대로 544 하이프라자 3층'),
('대한민국', 'JDC (Jhonatan Dance Class)', '학원', '인천 연수구 송도 G-Tower 인근'),
('대한민국', '하이프라자 살사/바차타', '학원', '전북 전주시 덕진동 2가 544 3층');
