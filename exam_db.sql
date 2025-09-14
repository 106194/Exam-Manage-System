--
-- PostgreSQL database dump
--

-- Dumped from database version 17.5
-- Dumped by pg_dump version 17.5

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: delete_user_dependencies(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.delete_user_dependencies() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
DECLARE
  exam_ids INT[];
  question_ids INT[];
BEGIN
  IF OLD."Role" = 'student' THEN
    DELETE FROM student_answer WHERE student_id = OLD."User_ID";
    DELETE FROM leaderboard WHERE student_id = OLD."User_ID";
    DELETE FROM "Student" WHERE "User_ID" = OLD."User_ID";

  ELSIF OLD."Role" = 'teacher' THEN
    -- Get all exams by teacher
    SELECT ARRAY(SELECT exam_id FROM exams WHERE user_id = OLD."User_ID") INTO exam_ids;

    -- Get all questions in those exams
    SELECT ARRAY(
      SELECT question_id FROM exam_question WHERE exam_id = ANY(exam_ids)
    ) INTO question_ids;

    -- Delete options for those questions
    DELETE FROM optiontable WHERE question_id = ANY(question_ids);
    DELETE FROM question WHERE question_id = ANY(question_ids);
    DELETE FROM exam_question WHERE exam_id = ANY(exam_ids);
    DELETE FROM leaderboard WHERE exam_id = ANY(exam_ids);
    DELETE FROM exams WHERE user_id = OLD."User_ID";
    DELETE FROM "Teacher" WHERE "User_ID" = OLD."User_ID";
  END IF;

  RETURN OLD;
END;
$$;


ALTER FUNCTION public.delete_user_dependencies() OWNER TO postgres;

--
-- Name: increment_total_exam_created(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.increment_total_exam_created() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  UPDATE "Teacher"
  SET "Total_Exam_Created" = "Total_Exam_Created" + 1
  WHERE "User_ID" = NEW.user_id;
  RETURN NEW;
END;
$$;


ALTER FUNCTION public.increment_total_exam_created() OWNER TO postgres;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: Author; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."Author" (
    "Author_ID" integer NOT NULL,
    "Name" character varying,
    "Qualification" character varying
);


ALTER TABLE public."Author" OWNER TO postgres;

--
-- Name: Author_Author_ID_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public."Author_Author_ID_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public."Author_Author_ID_seq" OWNER TO postgres;

--
-- Name: Author_Author_ID_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public."Author_Author_ID_seq" OWNED BY public."Author"."Author_ID";


--
-- Name: Author_Book; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."Author_Book" (
    "Author_ID" integer NOT NULL,
    "Book_ID" integer NOT NULL
);


ALTER TABLE public."Author_Book" OWNER TO postgres;

--
-- Name: Books; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."Books" (
    "Book_ID" integer NOT NULL,
    "Subject_ID" integer,
    "Title" character varying,
    "Level" character varying
);


ALTER TABLE public."Books" OWNER TO postgres;

--
-- Name: Books_Book_ID_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public."Books_Book_ID_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public."Books_Book_ID_seq" OWNER TO postgres;

--
-- Name: Books_Book_ID_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public."Books_Book_ID_seq" OWNED BY public."Books"."Book_ID";


--
-- Name: ChapterExam; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."ChapterExam" (
    "Exam_ID" integer NOT NULL,
    "Chapter_ID" integer NOT NULL
);


ALTER TABLE public."ChapterExam" OWNER TO postgres;

--
-- Name: ExamFilterTag; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."ExamFilterTag" (
    "Tag_ID" integer NOT NULL,
    "Tag_Name" character varying
);


ALTER TABLE public."ExamFilterTag" OWNER TO postgres;

--
-- Name: ExamFilterTag_Tag_ID_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public."ExamFilterTag_Tag_ID_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public."ExamFilterTag_Tag_ID_seq" OWNER TO postgres;

--
-- Name: ExamFilterTag_Tag_ID_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public."ExamFilterTag_Tag_ID_seq" OWNED BY public."ExamFilterTag"."Tag_ID";


--
-- Name: ExamTagMap; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."ExamTagMap" (
    "Tag_ID" integer NOT NULL,
    "Exam_ID" integer NOT NULL
);


ALTER TABLE public."ExamTagMap" OWNER TO postgres;

--
-- Name: Exam_Submission; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."Exam_Submission" (
    "Submission_ID" integer NOT NULL,
    "Exam_ID" integer,
    "Student_ID" integer,
    "CorrectAnswers" integer,
    "WrongAnswers" integer,
    "Total_Marks" integer,
    "Acquired_Marks" integer,
    "Position" integer,
    "Submission_Time" timestamp without time zone,
    is_late boolean
);


ALTER TABLE public."Exam_Submission" OWNER TO postgres;

--
-- Name: Exam_Submission_Submission_ID_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public."Exam_Submission_Submission_ID_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public."Exam_Submission_Submission_ID_seq" OWNER TO postgres;

--
-- Name: Exam_Submission_Submission_ID_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public."Exam_Submission_Submission_ID_seq" OWNED BY public."Exam_Submission"."Submission_ID";


--
-- Name: PendingUsers; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."PendingUsers" (
    "Token" text NOT NULL,
    "Full_Name" text NOT NULL,
    username text NOT NULL,
    "Password" text NOT NULL,
    "Email" text NOT NULL,
    "Institution" text,
    "Phone" text,
    "Role" text NOT NULL,
    "Created_At" timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public."PendingUsers" OWNER TO postgres;

--
-- Name: ResetTokens; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."ResetTokens" (
    "Token" text NOT NULL,
    "Email" character varying(100) NOT NULL,
    "Created_At" timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public."ResetTokens" OWNER TO postgres;

--
-- Name: Student; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."Student" (
    "User_ID" integer NOT NULL,
    username character varying NOT NULL,
    "Profile_Pic" character varying,
    "Registration_Date" date,
    "Total_Exam_Participated" integer,
    "Bio" character varying,
    total_answered integer DEFAULT 0,
    total_wrong integer DEFAULT 0,
    score_hidden boolean DEFAULT false
);


ALTER TABLE public."Student" OWNER TO postgres;

--
-- Name: Student_Accuracy; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."Student_Accuracy" (
    "Accuracy_ID" integer NOT NULL,
    "Student_ID" integer,
    "Subject_ID" integer,
    "Accuracy_Parcentage" double precision
);


ALTER TABLE public."Student_Accuracy" OWNER TO postgres;

--
-- Name: Student_Accuracy_Accuracy_ID_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public."Student_Accuracy_Accuracy_ID_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public."Student_Accuracy_Accuracy_ID_seq" OWNER TO postgres;

--
-- Name: Student_Accuracy_Accuracy_ID_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public."Student_Accuracy_Accuracy_ID_seq" OWNED BY public."Student_Accuracy"."Accuracy_ID";


--
-- Name: Teacher; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."Teacher" (
    "User_ID" integer NOT NULL,
    username character varying,
    "Profile_Pic" character varying,
    "Registration_Date" date,
    "Total_Exam_Created" integer,
    "Bio" character varying
);


ALTER TABLE public."Teacher" OWNER TO postgres;

--
-- Name: Users; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."Users" (
    "User_ID" integer NOT NULL,
    username character varying NOT NULL,
    "Full_Name" character varying,
    "Password" character varying,
    "Email" character varying,
    "Institution" character varying,
    "Phone" character varying,
    "Role" character varying
);


ALTER TABLE public."Users" OWNER TO postgres;

--
-- Name: Users_User_ID_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public."Users_User_ID_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public."Users_User_ID_seq" OWNER TO postgres;

--
-- Name: Users_User_ID_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public."Users_User_ID_seq" OWNED BY public."Users"."User_ID";


--
-- Name: chapters; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.chapters (
    chapter_id character varying(100) NOT NULL,
    subject_id character varying(20),
    name character varying
);


ALTER TABLE public.chapters OWNER TO postgres;

--
-- Name: exam_question; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.exam_question (
    exam_id integer NOT NULL,
    question_id integer NOT NULL
);


ALTER TABLE public.exam_question OWNER TO postgres;

--
-- Name: exams; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.exams (
    exam_id integer NOT NULL,
    title character varying(255) NOT NULL,
    password text,
    total_marks integer,
    subject_id character varying(20),
    issubjectwise boolean DEFAULT false,
    ischapterwise boolean DEFAULT false,
    start_time timestamp without time zone NOT NULL,
    end_time timestamp without time zone NOT NULL,
    user_id integer,
    chapter_id character varying(100),
    question_count integer
);


ALTER TABLE public.exams OWNER TO postgres;

--
-- Name: exams_exam_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.exams_exam_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.exams_exam_id_seq OWNER TO postgres;

--
-- Name: exams_exam_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.exams_exam_id_seq OWNED BY public.exams.exam_id;


--
-- Name: fahim; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.fahim (
    id integer NOT NULL,
    username character varying(100) NOT NULL,
    password text NOT NULL
);


ALTER TABLE public.fahim OWNER TO postgres;

--
-- Name: fahim_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.fahim_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.fahim_id_seq OWNER TO postgres;

--
-- Name: fahim_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.fahim_id_seq OWNED BY public.fahim.id;


--
-- Name: leaderboard; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.leaderboard (
    exam_id integer NOT NULL,
    student_id integer NOT NULL,
    score integer NOT NULL,
    submitted_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    correct_answer integer NOT NULL,
    wrong_answer integer NOT NULL
);


ALTER TABLE public.leaderboard OWNER TO postgres;

--
-- Name: messagebox; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.messagebox (
    message_id integer NOT NULL,
    sender_username character varying(50) NOT NULL,
    sender_role character varying(10) NOT NULL,
    textcontent text NOT NULL,
    sent_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    subject text,
    CONSTRAINT messagebox_sender_role_check CHECK (((sender_role)::text = ANY ((ARRAY['student'::character varying, 'teacher'::character varying])::text[])))
);


ALTER TABLE public.messagebox OWNER TO postgres;

--
-- Name: messagebox_message_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.messagebox_message_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.messagebox_message_id_seq OWNER TO postgres;

--
-- Name: messagebox_message_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.messagebox_message_id_seq OWNED BY public.messagebox.message_id;


--
-- Name: optiontable; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.optiontable (
    option_id integer NOT NULL,
    question_id integer NOT NULL,
    is_correct boolean DEFAULT false NOT NULL,
    text text,
    image text
);


ALTER TABLE public.optiontable OWNER TO postgres;

--
-- Name: optiontabel_option_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.optiontabel_option_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.optiontabel_option_id_seq OWNER TO postgres;

--
-- Name: optiontabel_option_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.optiontabel_option_id_seq OWNED BY public.optiontable.option_id;


--
-- Name: question; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.question (
    question_id integer NOT NULL,
    chapter_id character varying(100),
    points integer DEFAULT 1 NOT NULL,
    text text,
    image text,
    subject_id character varying
);


ALTER TABLE public.question OWNER TO postgres;

--
-- Name: question_question_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.question_question_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.question_question_id_seq OWNER TO postgres;

--
-- Name: question_question_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.question_question_id_seq OWNED BY public.question.question_id;


--
-- Name: student_answer; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.student_answer (
    answer_id integer NOT NULL,
    student_id integer,
    exam_id integer,
    question_id integer,
    selected_option_id integer,
    submitted_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    is_auto_submitted boolean DEFAULT false
);


ALTER TABLE public.student_answer OWNER TO postgres;

--
-- Name: student_answer_answer_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.student_answer_answer_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.student_answer_answer_id_seq OWNER TO postgres;

--
-- Name: student_answer_answer_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.student_answer_answer_id_seq OWNED BY public.student_answer.answer_id;


--
-- Name: subjects; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.subjects (
    subject_id character varying NOT NULL,
    name character varying,
    level character varying
);


ALTER TABLE public.subjects OWNER TO postgres;

--
-- Name: Author Author_ID; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Author" ALTER COLUMN "Author_ID" SET DEFAULT nextval('public."Author_Author_ID_seq"'::regclass);


--
-- Name: Books Book_ID; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Books" ALTER COLUMN "Book_ID" SET DEFAULT nextval('public."Books_Book_ID_seq"'::regclass);


--
-- Name: ExamFilterTag Tag_ID; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."ExamFilterTag" ALTER COLUMN "Tag_ID" SET DEFAULT nextval('public."ExamFilterTag_Tag_ID_seq"'::regclass);


--
-- Name: Exam_Submission Submission_ID; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Exam_Submission" ALTER COLUMN "Submission_ID" SET DEFAULT nextval('public."Exam_Submission_Submission_ID_seq"'::regclass);


--
-- Name: Student_Accuracy Accuracy_ID; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Student_Accuracy" ALTER COLUMN "Accuracy_ID" SET DEFAULT nextval('public."Student_Accuracy_Accuracy_ID_seq"'::regclass);


--
-- Name: Users User_ID; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Users" ALTER COLUMN "User_ID" SET DEFAULT nextval('public."Users_User_ID_seq"'::regclass);


--
-- Name: exams exam_id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.exams ALTER COLUMN exam_id SET DEFAULT nextval('public.exams_exam_id_seq'::regclass);


--
-- Name: fahim id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.fahim ALTER COLUMN id SET DEFAULT nextval('public.fahim_id_seq'::regclass);


--
-- Name: messagebox message_id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.messagebox ALTER COLUMN message_id SET DEFAULT nextval('public.messagebox_message_id_seq'::regclass);


--
-- Name: optiontable option_id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.optiontable ALTER COLUMN option_id SET DEFAULT nextval('public.optiontabel_option_id_seq'::regclass);


--
-- Name: question question_id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.question ALTER COLUMN question_id SET DEFAULT nextval('public.question_question_id_seq'::regclass);


--
-- Name: student_answer answer_id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.student_answer ALTER COLUMN answer_id SET DEFAULT nextval('public.student_answer_answer_id_seq'::regclass);


--
-- Data for Name: Author; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."Author" ("Author_ID", "Name", "Qualification") FROM stdin;
\.


--
-- Data for Name: Author_Book; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."Author_Book" ("Author_ID", "Book_ID") FROM stdin;
\.


--
-- Data for Name: Books; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."Books" ("Book_ID", "Subject_ID", "Title", "Level") FROM stdin;
\.


--
-- Data for Name: ChapterExam; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."ChapterExam" ("Exam_ID", "Chapter_ID") FROM stdin;
\.


--
-- Data for Name: ExamFilterTag; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."ExamFilterTag" ("Tag_ID", "Tag_Name") FROM stdin;
\.


--
-- Data for Name: ExamTagMap; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."ExamTagMap" ("Tag_ID", "Exam_ID") FROM stdin;
\.


--
-- Data for Name: Exam_Submission; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."Exam_Submission" ("Submission_ID", "Exam_ID", "Student_ID", "CorrectAnswers", "WrongAnswers", "Total_Marks", "Acquired_Marks", "Position", "Submission_Time", is_late) FROM stdin;
\.


--
-- Data for Name: PendingUsers; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."PendingUsers" ("Token", "Full_Name", username, "Password", "Email", "Institution", "Phone", "Role", "Created_At") FROM stdin;
\.


--
-- Data for Name: ResetTokens; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."ResetTokens" ("Token", "Email", "Created_At") FROM stdin;
\.


--
-- Data for Name: Student; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."Student" ("User_ID", username, "Profile_Pic", "Registration_Date", "Total_Exam_Participated", "Bio", total_answered, total_wrong, score_hidden) FROM stdin;
121	farhana	/uploads/default.png	2025-06-15	0		0	0	t
123	Nipa	/uploads/default.png	2025-06-15	0		0	0	f
132	The fizzzzzr		2025-07-30	0		0	0	f
134	Nazia		2025-07-30	0	Student	0	0	f
137	Radia		2025-07-30	0		0	0	f
138	Nomit		2025-07-30	0		0	0	f
\.


--
-- Data for Name: Student_Accuracy; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."Student_Accuracy" ("Accuracy_ID", "Student_ID", "Subject_ID", "Accuracy_Parcentage") FROM stdin;
\.


--
-- Data for Name: Teacher; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."Teacher" ("User_ID", username, "Profile_Pic", "Registration_Date", "Total_Exam_Created", "Bio") FROM stdin;
135	Akif		2025-07-30	0	Teacher
136	Sakib		2025-07-30	0	Teacher
\.


--
-- Data for Name: Users; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."Users" ("User_ID", username, "Full_Name", "Password", "Email", "Institution", "Phone", "Role") FROM stdin;
121	farhana	Farhana Hoque	$2b$10$cRKnh6Y2PWsh5kLWKH4AROps.fVPac1fTHlwIcHPLTP1xcA/BrP7y	farhanahoque556@gmail.com		01776830747	student
132	The fizzzzzr	Rafid Mostafiz	$2b$10$c68DdycYkR/vA4L.sf7.hO4RiPIaCVMEJbkDKA9.ehQ.okKA/QLwa	abc@gmai.com	BUET	111	student
123	Nipa	Israt Jahan Nipa	$2b$10$ujdNxzTr6JxK9B8UJIzKAurRFyQz9SFS1A8ZU0hK4lQ5wQW7riOgS	isjnipa2731@gmail.com	BUET	01886755526	student
134	Nazia	Nazia Jannat	$2b$10$nf.SwbtCl2shPJmLbD3I0O5.8u11sHl/bzteyLl5BbsAQihbMDA6O	ade23@gmail.com	City Govt. Girls School	12124324	student
135	Akif	Akif Rahman	$2b$10$y9Z530amwR.fvDSjQxA/EOVkdw3N4hKSBdxDfJzUNDRPYQFMb5oX.	akif234@gmail.com	Ctg college	23645354	teacher
136	Sakib	Sakib Alom	$2b$10$CIeqDz/Osk01ov2/TaN.H.9odvXe0SlFoxRA5deiE35W14fQX3Ar6	sakib@gmail.com	Khulna School	133253	teacher
137	Radia	Radia Khan	$2b$10$dQt/ZNUOGCjG3vZhQqYJQ.LpUUjPXrsIShWgP85Tgl8sNKTLkO7zW	radia@gmail.com	Mohsin College	24353444	student
138	Nomit	Nomit Rahman	$2b$10$5ZYyVqyELvKbU3O6n174AuX2zGPOaqnEDBss9XEdoKR53MAEOVEsW	nomit@gmail.com	Rajshahi School	123435535	student
\.


--
-- Data for Name: chapters; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.chapters (chapter_id, subject_id, name) FROM stdin;
HSCChapter-1: Physics World and Measurement	\N	Chapter-1: Physics World and Measurement
HSCChapter-2: Vector	\N	Chapter-2: Vector
HSCChapter-3: Dynamics	\N	Chapter-3: Dynamics
HSCChapter-4: Newtonian Mechanics	\N	Chapter-4: Newtonian Mechanics
HSCChapter-5: Work, Energy and Power	\N	Chapter-5: Work, Energy and Power
HSCChapter-6: Gravitation and Gravity	\N	Chapter-6: Gravitation and Gravity
HSCChapter-7: Structural Properties of Matter	\N	Chapter-7: Structural Properties of Matter
HSCChapter-1: Matrices and Determinants	\N	Chapter-1: Matrices and Determinants
HSCChapter-3: Straight Lines	\N	Chapter-3: Straight Lines
HSCChapter-4: The Circle	\N	Chapter-4: The Circle
HSCChapter-5: Permutations and Combinations	\N	Chapter-5: Permutations and Combinations
HSCChapter-6: Trigonometric Ratios	\N	Chapter-6: Trigonometric Ratios
HSCChapter-7: Trigonometric Ratios of Associated Angles	\N	Chapter-7: Trigonometric Ratios of Associated Angles
HSCChapter-8: Functions and Graph of Functions	\N	Chapter-8: Functions and Graph of Functions
HSCChapter-9: Differentiations	\N	Chapter-9: Differentiations
HSCChapter-10: Integration	\N	Chapter-10: Integration
HSCChapter-1: Real Number and Inequalities	\N	Chapter-1: Real Number and Inequalities
HSCChapter-2: Linear Programming	\N	Chapter-2: Linear Programming
HSCChapter-3: Complex Number	\N	Chapter-3: Complex Number
HSCChapter-4: Polynomials and Polynomial Equations	\N	Chapter-4: Polynomials and Polynomial Equations
HSCChapter-5: Binomial Expansions	\N	Chapter-5: Binomial Expansions
HSCChapter-6: Conics	\N	Chapter-6: Conics
HSCChapter-7: Inverse Trigonometric Functions and Trigonometric Equations	\N	Chapter-7: Inverse Trigonometric Functions and Trigonometric Equations
HSCChapter-8: Statics	\N	Chapter-8: Statics
HSCChapter-9: Motion of Particles in a Plane	\N	Chapter-9: Motion of Particles in a Plane
HSCChapter-10: Measures of Dispersions and Probability	\N	Chapter-10: Measures of Dispersions and Probability
HSCChapter-7: Locomation and Movement	HSCBiology2nd	\N
HSCChapter-8: Human Physiology: Coordination and Control	HSCBiology2nd	Chapter-8: Human Physiology: Coordination and Control
HSCChapter-1: Information and Communication Technology: World and Bangladesh Perspective	\N	Chapter-1: Information and Communication Technology: World and Bangladesh Perspective
HSCChapter-2: Communication System and Networking	\N	Chapter-2: Communication System and Networking
HSCChapter-3: Number Systems and Digital Device	\N	Chapter-3: Number Systems and Digital Device
HSCChapter-4: Introduction to Web Design and HTML	\N	Chapter-4: Introduction to Web Design and HTML
HSCChapter-5: Programming Language	\N	Chapter-5: Programming Language
HSCChapter-6: Database Management System	\N	Chapter-6: Database Management System
SSCChapter-1:Physics World and Measurement	\N	Chapter-1:Physics World and Measurement
SSCChapter-2:Motion and its Laws	\N	Chapter-2:Motion and its Laws
SSCChapter-3:Force and Momentum	\N	Chapter-3:Force and Momentum
SSCChapter-4:Work, Power, and Energy	\N	Chapter-4:Work, Power, and Energy
SSCChapter-5:State of Matters and Pressure	\N	Chapter-5:State of Matters and Pressure
SSCChapter-6:Heat and Temperature	\N	Chapter-6:Heat and Temperature
SSCChapter-7:Waves and Sound	\N	Chapter-7:Waves and Sound
SSCChapter-8:Reflection of Light	\N	Chapter-8:Reflection of Light
SSCChapter-9:Refraction of Light	\N	Chapter-9:Refraction of Light
SSCChapter-10:Static Electricity	\N	Chapter-10:Static Electricity
HSCChapter-1: Animal Diversity and Classification	HSCBiology2nd	Chapter-1: Animal Diversity and Classification
HSCChapter-1: Cell and Its Structure	HSCBiology1st	Chapter-1: Cell and Its Structure
HSCChapter-10: Immunity of Human Body	HSCBiology1st	Chapter-10: Immunity of Human Body
HSCChapter-10: Reproduction of Plants	HSCBiology1st	Chapter-10: Reproduction of Plants
HSCChapter-2: Animals Identity	HSCBiology2nd	Chapter-2: Animals Identity
HSCChapter-2: Cell Division	HSCBiology1st	Chapter-2: Cell Division
HSCChapter-3: Human Physiology: Digestion and Absorption	HSCBiology2nd	Chapter-3: Human Physiology: Digestion and Absorption
HSCChapter-3: Cell Chemistry	HSCBiology1st	\N
HSCChapter-4: Human Physiology: Blood and Circulation	HSCBiology2nd	Chapter-4: Human Physiology: Blood and Circulation
HSCChapter-4: Microorganisms	HSCBiology1st	Chapter-4: Microorganisms
HSCChapter-5: Algae and Fungi	HSCBiology1st	Chapter-5: Algae and Fungi
HSCChapter-6: Bryophyta and Pteridophyta	HSCBiology1st	Chapter-6: Bryophyta and Pteridophyta
HSCChapter-8: Tissue and Tissue System	HSCBiology1st	Chapter-8: Tissue and Tissue System
HSCChapter-9: Continuance of Human Life	HSCBiology2nd	Chapter-9: Continuance of Human Life
HSCChapter-9: Plant Physiology	HSCBiology1st	Chapter-9: Plant Physiology
HSCChapter-1: Environmental Chemistry	HSCChemistry2nd	Chapter-1: Environmental Chemistry
HSCChapter-2: Organic Chemistry	HSCChemistry2nd	Chapter-2: Organic Chemistry
HSCChapter-3: Quantitative Chemistry	HSCChemistry2nd	Chapter-3: Quantitative Chemistry
HSCChapter-4: Chemical Changes	HSCChemistry1st	Chapter-4: Chemical Changes
HSCChapter-4: Electrochemistry	HSCChemistry2nd	Chapter-4: Electrochemistry
HSCChapter-5: Economic Chemistry	HSCChemistry2nd	Chapter-5: Economic Chemistry
HSCChapter-5: Vocational Chemistry	HSCChemistry1st	Chapter-5: Vocational Chemistry
HSCChapter-1: Safe Use of Laboratory	HSCChemistry1st	Chapter-1: Safe Use of Laboratory
HSCChapter-2: Qualitative Chemistry	HSCChemistry1st	Chapter-2: Qualitative Chemistry
HSCChapter-3: Periodic Properties and Chemical Bonding of Elements	HSCChemistry1st	Chapter-3: Periodic Properties and Chemical Bonding of Elements
HSCChapter-8: Periodic Motion	\N	Chapter-8: Periodic Motion
HSCChapter-9: Waves	\N	Chapter-9: Waves
HSCChapter-10: Ideal Gas and Kinetic Theory of Gases	\N	Chapter-10: Ideal Gas and Kinetic Theory of Gases
HSCChapter-1: Thermodynamics	\N	Chapter-1: Thermodynamics
HSCChapter-2: Statical Electricity	\N	Chapter-2: Statical Electricity
HSCChapter-4: Magnetic Effects of Electric Current and Magnetism	\N	Chapter-4: Magnetic Effects of Electric Current and Magnetism
HSCChapter-5: Electromagnetic Induction and Alternating Current	\N	Chapter-5: Electromagnetic Induction and Alternating Current
HSCChapter-6: Geometrical Optics	\N	Chapter-6: Geometrical Optics
HSCChapter-7: Physical Optics	\N	Chapter-7: Physical Optics
HSCChapter-8: Introduction to Modern Physic	\N	Chapter-8: Introduction to Modern Physic
HSCChapter-9: Atomic Model and Nuclear Physics	\N	Chapter-9: Atomic Model and Nuclear Physics
HSCChapter-10: Semiconductor and Electronics	\N	Chapter-10: Semiconductor and Electronics
SSCChapter-11:Current Electricity	\N	Chapter-11:Current Electricity
SSCChapter-12:Electricity and Magnetism	\N	Chapter-12:Electricity and Magnetism
SSCChapter-10: Binomial Expansion	\N	Chapter-10: Binomial Expansion
SSCChapter-11: Coordinate Geometry	\N	Chapter-11: Coordinate Geometry
SSCChapter-12: Planar Vector	\N	Chapter-12: Planar Vector
SSCChapter-13: Solid Geometry	\N	Chapter-13: Solid Geometry
SSCChapter-14: Probability	\N	Chapter-14: Probability
SSCChapter-13:Modern Physics	\N	Chapter-13:Modern Physics
SSCChapter-14:Physics to Save Life	\N	Chapter-14:Physics to Save Life
SSCChapter-1: Set and Function	\N	Chapter-1: Set and Function
SSCChapter-2: Algebraic Expression	\N	Chapter-2: Algebraic Expression
SSCChapter-3: Geometry	\N	Chapter-3: Geometry
SSCChapter-4: Geometric Constructions	\N	Chapter-4: Geometric Constructions
SSCChapter-5: Equation	\N	Chapter-5: Equation
SSCChapter-6: Inequality	\N	Chapter-6: Inequality
SSCChapter-7: Infinite Series	\N	Chapter-7: Infinite Series
SSCChapter-8: Trigonometry	\N	Chapter-8: Trigonometry
SSCChapter-9: Exponential and Logarithmic Function	\N	Chapter-9: Exponential and Logarithmic Function
SSCChapter-1:Concept of Chemistry	SSCChemistry	Chapter-1:Concept of Chemistry
SSCChapter-10:Mineral Resources: Metal-Nonmetal	SSCChemistry	Chapter-10:Mineral Resources: Metal-Nonmetal
SSCChapter-11:Mineral Resources-Fossil	SSCChemistry	Chapter-11:Mineral Resources-Fossil
SSCChapter-12:Chemistry in our Life	SSCChemistry	Chapter-12:Chemistry in our Life
SSCChapter-2:States of Matter	SSCChemistry	Chapter-2:States of Matter
SSCChapter-3:Structure of Matter	SSCChemistry	Chapter-3:Structure of Matter
SSCChapter-4:Periodic Table	SSCChemistry	Chapter-4:Periodic Table
SSCChapter-5:Chemical Bonds	SSCChemistry	Chapter-5:Chemical Bonds
SSCChapter-6:Concept of Mole and Chemical Calculations	SSCChemistry	Chapter-6:Concept of Mole and Chemical Calculations
SSCChapter-7:Chemical Reaction	SSCChemistry	Chapter-7:Chemical Reaction
SSCChapter-8:Chemistry and Energy	SSCChemistry	Chapter-8:Chemistry and Energy
SSCChapter-9:Acid-Base Balance	SSCChemistry	Chapter-9:Acid-Base Balance
SSCChapter-1: Information and Communication Technology and Our Bangladesh	\N	Chapter-1: Information and Communication Technology and Our Bangladesh
SSCChapter-2: Computer and The Security of the User	\N	Chapter-2: Computer and The Security of the User
SSCChapter-3: The Internet in My Education	\N	Chapter-3: The Internet in My Education
SSCChapter-4: My Writing and Accounts	\N	Chapter-4: My Writing and Accounts
SSCChapter-5: Multimedia and Graphics	\N	Chapter-5: Multimedia and Graphics
SSCChapter-6: The User of Database	\N	Chapter-6: The User of Database
HSCChapter-5: Human Physiology: Respiratory Process and Respiration	HSCBiology2nd	Chapter-5: Human Physiology: Respiratory Process and Respiration
HSCChapter-6: Human Physiology: Excretory Products and Excretion	HSCBiology2nd	Chapter-6: Human Physiology: Excretory Products and Excretion
HSCChapter-7: Gymnosperms and Angiosperms	HSCBiology1st	Chapter-7: Gymnosperms and Angiosperms
Others	\N	Others
SSCChapter-1: Lessons on Life	SSCBiology	Chapter-1: Lessons on Life
SSCChapter-10: Co-ordination	SSCBiology	Chapter-10: Co-ordination
SSCChapter-11: Reproduction in Organism	SSCBiology	Chapter-11: Reproduction in Organism
SSCChapter-12: Heredity in Organisms and Biological Evolution	SSCBiology	Chapter-12: Heredity in Organisms and Biological Evolution
SSCChapter-13: Environment of life	SSCBiology	Chapter-13: Environment of life
SSCChapter-14: Biotechnology	SSCBiology	Chapter-14: Biotechnology
SSCChapter-2: Cells and Tissues of Organisms	SSCBiology	Chapter-2: Cells and Tissues of Organisms
SSCChapter-3: Cell Division	SSCBiology	Chapter-3: Cell Division
SSCChapter-4: Bioenergetics	SSCBiology	Chapter-4: Bioenergetics
SSCChapter-5: Food, Nutrition and Digestion	SSCBiology	Chapter-5: Food, Nutrition and Digestion
SSCChapter-6: Transport in Organisms	SSCBiology	Chapter-6: Transport in Organisms
SSCChapter-7: Exchange of Gases	SSCBiology	Chapter-7: Exchange of Gases
SSCChapter-8: Excretory System	SSCBiology	Chapter-8: Excretory System
SSCChapter-9: Firmness and Locomotion	SSCBiology	Chapter-9: Firmness and Locomotion
\.


--
-- Data for Name: exam_question; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.exam_question (exam_id, question_id) FROM stdin;
\.


--
-- Data for Name: exams; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.exams (exam_id, title, password, total_marks, subject_id, issubjectwise, ischapterwise, start_time, end_time, user_id, chapter_id, question_count) FROM stdin;
\.


--
-- Data for Name: fahim; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.fahim (id, username, password) FROM stdin;
1	fahim106194	$2b$10$mHWmb5dgI1P5HpX17SYAqeXbnHOX4ojy6AQVPcKV3.BjmpynOULG2
\.


--
-- Data for Name: leaderboard; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.leaderboard (exam_id, student_id, score, submitted_at, correct_answer, wrong_answer) FROM stdin;
\.


--
-- Data for Name: messagebox; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.messagebox (message_id, sender_username, sender_role, textcontent, sent_at, subject) FROM stdin;
5	The fizzzzzr	student	Deactivate my account	2025-07-30 12:39:25.829435	Deactivate
\.


--
-- Data for Name: optiontable; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.optiontable (option_id, question_id, is_correct, text, image) FROM stdin;
\.


--
-- Data for Name: question; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.question (question_id, chapter_id, points, text, image, subject_id) FROM stdin;
\.


--
-- Data for Name: student_answer; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.student_answer (answer_id, student_id, exam_id, question_id, selected_option_id, submitted_at, is_auto_submitted) FROM stdin;
\.


--
-- Data for Name: subjects; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.subjects (subject_id, name, level) FROM stdin;
HSCBiology1st	Biology 1st	HSC
HSCBiology2nd	Biology 2nd	HSC
HSCChemistry1st	Chemistry 1st	HSC
HSCChemistry2nd	Chemistry 2nd	HSC
HSCICT	ICT	HSC
HSCMath1st	Math 1st	HSC
HSCMath2nd	Math 2nd	HSC
HSCPhysics1st	Physics 1st	HSC
HSCPhysics2nd	Physics 2nd	HSC
Others	Others	Others
SSCBiology	Biology	SSC
SSCChemistry	Chemistry	SSC
SSCICT	ICT	SSC
SSCMath	Math	SSC
SSCPhysics	Physics	SSC
\.


--
-- Name: Author_Author_ID_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public."Author_Author_ID_seq"', 1, false);


--
-- Name: Books_Book_ID_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public."Books_Book_ID_seq"', 1, false);


--
-- Name: ExamFilterTag_Tag_ID_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public."ExamFilterTag_Tag_ID_seq"', 1, false);


--
-- Name: Exam_Submission_Submission_ID_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public."Exam_Submission_Submission_ID_seq"', 1, false);


--
-- Name: Student_Accuracy_Accuracy_ID_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public."Student_Accuracy_Accuracy_ID_seq"', 1, false);


--
-- Name: Users_User_ID_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public."Users_User_ID_seq"', 138, true);


--
-- Name: exams_exam_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.exams_exam_id_seq', 372, true);


--
-- Name: fahim_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.fahim_id_seq', 33, true);


--
-- Name: messagebox_message_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.messagebox_message_id_seq', 5, true);


--
-- Name: optiontabel_option_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.optiontabel_option_id_seq', 145, true);


--
-- Name: question_question_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.question_question_id_seq', 112, true);


--
-- Name: student_answer_answer_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.student_answer_answer_id_seq', 585, true);


--
-- Name: Author_Book Author_Book_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Author_Book"
    ADD CONSTRAINT "Author_Book_pkey" PRIMARY KEY ("Author_ID", "Book_ID");


--
-- Name: Author Author_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Author"
    ADD CONSTRAINT "Author_pkey" PRIMARY KEY ("Author_ID");


--
-- Name: Books Books_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Books"
    ADD CONSTRAINT "Books_pkey" PRIMARY KEY ("Book_ID");


--
-- Name: ChapterExam ChapterExam_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."ChapterExam"
    ADD CONSTRAINT "ChapterExam_pkey" PRIMARY KEY ("Exam_ID", "Chapter_ID");


--
-- Name: ExamFilterTag ExamFilterTag_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."ExamFilterTag"
    ADD CONSTRAINT "ExamFilterTag_pkey" PRIMARY KEY ("Tag_ID");


--
-- Name: ExamTagMap ExamTagMap_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."ExamTagMap"
    ADD CONSTRAINT "ExamTagMap_pkey" PRIMARY KEY ("Tag_ID", "Exam_ID");


--
-- Name: Exam_Submission Exam_Submission_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Exam_Submission"
    ADD CONSTRAINT "Exam_Submission_pkey" PRIMARY KEY ("Submission_ID");


--
-- Name: PendingUsers PendingUsers_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."PendingUsers"
    ADD CONSTRAINT "PendingUsers_pkey" PRIMARY KEY ("Token");


--
-- Name: ResetTokens ResetTokens_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."ResetTokens"
    ADD CONSTRAINT "ResetTokens_pkey" PRIMARY KEY ("Token");


--
-- Name: Student_Accuracy Student_Accuracy_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Student_Accuracy"
    ADD CONSTRAINT "Student_Accuracy_pkey" PRIMARY KEY ("Accuracy_ID");


--
-- Name: Student Student_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Student"
    ADD CONSTRAINT "Student_pkey" PRIMARY KEY ("User_ID");


--
-- Name: Teacher Teacher_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Teacher"
    ADD CONSTRAINT "Teacher_pkey" PRIMARY KEY ("User_ID");


--
-- Name: Users Users_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Users"
    ADD CONSTRAINT "Users_pkey" PRIMARY KEY ("User_ID");


--
-- Name: chapters chapters_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.chapters
    ADD CONSTRAINT chapters_pkey PRIMARY KEY (chapter_id);


--
-- Name: exam_question exam_question_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.exam_question
    ADD CONSTRAINT exam_question_pkey PRIMARY KEY (exam_id, question_id);


--
-- Name: exams exams_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.exams
    ADD CONSTRAINT exams_pkey PRIMARY KEY (exam_id);


--
-- Name: fahim fahim_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.fahim
    ADD CONSTRAINT fahim_pkey PRIMARY KEY (id);


--
-- Name: leaderboard leaderboard_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.leaderboard
    ADD CONSTRAINT leaderboard_pkey PRIMARY KEY (exam_id, student_id);


--
-- Name: messagebox messagebox_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.messagebox
    ADD CONSTRAINT messagebox_pkey PRIMARY KEY (message_id);


--
-- Name: optiontable optiontabel_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.optiontable
    ADD CONSTRAINT optiontabel_pkey PRIMARY KEY (option_id);


--
-- Name: question question_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.question
    ADD CONSTRAINT question_pkey PRIMARY KEY (question_id);


--
-- Name: student_answer student_answer_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.student_answer
    ADD CONSTRAINT student_answer_pkey PRIMARY KEY (answer_id);


--
-- Name: subjects subjects_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.subjects
    ADD CONSTRAINT subjects_pkey PRIMARY KEY (subject_id);


--
-- Name: Users trg_delete_user_dependencies; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER trg_delete_user_dependencies BEFORE DELETE ON public."Users" FOR EACH ROW EXECUTE FUNCTION public.delete_user_dependencies();


--
-- Name: exams trg_increment_exam_count; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER trg_increment_exam_count AFTER INSERT ON public.exams FOR EACH ROW EXECUTE FUNCTION public.increment_total_exam_created();


--
-- Name: Author_Book Author_Book_Author_ID_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Author_Book"
    ADD CONSTRAINT "Author_Book_Author_ID_fkey" FOREIGN KEY ("Author_ID") REFERENCES public."Author"("Author_ID");


--
-- Name: Author_Book Author_Book_Book_ID_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Author_Book"
    ADD CONSTRAINT "Author_Book_Book_ID_fkey" FOREIGN KEY ("Book_ID") REFERENCES public."Books"("Book_ID");


--
-- Name: ExamTagMap ExamTagMap_Tag_ID_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."ExamTagMap"
    ADD CONSTRAINT "ExamTagMap_Tag_ID_fkey" FOREIGN KEY ("Tag_ID") REFERENCES public."ExamFilterTag"("Tag_ID");


--
-- Name: Student Student_User_ID_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Student"
    ADD CONSTRAINT "Student_User_ID_fkey" FOREIGN KEY ("User_ID") REFERENCES public."Users"("User_ID");


--
-- Name: Teacher Teacher_User_ID_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Teacher"
    ADD CONSTRAINT "Teacher_User_ID_fkey" FOREIGN KEY ("User_ID") REFERENCES public."Users"("User_ID");


--
-- Name: chapters chapters_subject_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.chapters
    ADD CONSTRAINT chapters_subject_id_fkey FOREIGN KEY (subject_id) REFERENCES public.subjects(subject_id);


--
-- Name: exams exam_chaptert_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.exams
    ADD CONSTRAINT exam_chaptert_id_fkey FOREIGN KEY (chapter_id) REFERENCES public.chapters(chapter_id) NOT VALID;


--
-- Name: exam_question exam_question_exam_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.exam_question
    ADD CONSTRAINT exam_question_exam_id_fkey FOREIGN KEY (exam_id) REFERENCES public.exams(exam_id) ON DELETE CASCADE;


--
-- Name: exam_question exam_question_question_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.exam_question
    ADD CONSTRAINT exam_question_question_id_fkey FOREIGN KEY (question_id) REFERENCES public.question(question_id) ON DELETE CASCADE;


--
-- Name: exams exams_subject_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.exams
    ADD CONSTRAINT exams_subject_id_fkey FOREIGN KEY (subject_id) REFERENCES public.subjects(subject_id) ON DELETE SET NULL;


--
-- Name: exams exams_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.exams
    ADD CONSTRAINT exams_user_id_fkey FOREIGN KEY (user_id) REFERENCES public."Users"("User_ID") ON DELETE CASCADE;


--
-- Name: leaderboard leaderboard_exam_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.leaderboard
    ADD CONSTRAINT leaderboard_exam_id_fkey FOREIGN KEY (exam_id) REFERENCES public.exams(exam_id) ON DELETE CASCADE;


--
-- Name: leaderboard leaderboard_student_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.leaderboard
    ADD CONSTRAINT leaderboard_student_id_fkey FOREIGN KEY (student_id) REFERENCES public."Users"("User_ID") ON DELETE CASCADE;


--
-- Name: optiontable optiontabel_question_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.optiontable
    ADD CONSTRAINT optiontabel_question_id_fkey FOREIGN KEY (question_id) REFERENCES public.question(question_id) ON DELETE CASCADE;


--
-- Name: question question_chapter_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.question
    ADD CONSTRAINT question_chapter_id_fkey FOREIGN KEY (chapter_id) REFERENCES public.chapters(chapter_id) ON DELETE CASCADE;


--
-- Name: student_answer student_answer_exam_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.student_answer
    ADD CONSTRAINT student_answer_exam_id_fkey FOREIGN KEY (exam_id) REFERENCES public.exams(exam_id) ON DELETE CASCADE;


--
-- Name: student_answer student_answer_question_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.student_answer
    ADD CONSTRAINT student_answer_question_id_fkey FOREIGN KEY (question_id) REFERENCES public.question(question_id) ON DELETE CASCADE;


--
-- Name: student_answer student_answer_selected_option_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.student_answer
    ADD CONSTRAINT student_answer_selected_option_id_fkey FOREIGN KEY (selected_option_id) REFERENCES public.optiontable(option_id) ON DELETE SET NULL;


--
-- Name: student_answer student_answer_student_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.student_answer
    ADD CONSTRAINT student_answer_student_id_fkey FOREIGN KEY (student_id) REFERENCES public."Student"("User_ID") ON DELETE CASCADE;


--
-- PostgreSQL database dump complete
--

