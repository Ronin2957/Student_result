-- ============================================================
-- SCHOLASTIC RESULT ANALYSIS — DEMO PROJECT (Both Methods)
-- Run this in phpMyAdmin or MySQL CLI (XAMPP)
-- ============================================================

CREATE DATABASE IF NOT EXISTS paradigm_result
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE paradigm_result;

-- Student table
CREATE TABLE IF NOT EXISTS Student (
    roll_no     INT          NOT NULL,
    name        VARCHAR(100) NOT NULL,
    seat_no     VARCHAR(20)  NOT NULL,
    category    VARCHAR(30)  NOT NULL DEFAULT 'General',
    year        INT          NOT NULL,
    semester    INT          NOT NULL,
    PRIMARY KEY (roll_no)
) ENGINE=InnoDB;

-- Subject table
CREATE TABLE IF NOT EXISTS Subject (
    subject_id   VARCHAR(20)  NOT NULL,
    subject_name VARCHAR(100) NOT NULL,
    credits      INT          NOT NULL,
    semester     INT          NOT NULL DEFAULT 1,
    PRIMARY KEY (subject_id)
) ENGINE=InnoDB;

-- Component table (I1, E1, T1, O1, etc.)
CREATE TABLE IF NOT EXISTS Component (
    component_id   INT          NOT NULL AUTO_INCREMENT,
    subject_id     VARCHAR(20)  NOT NULL,
    component_name VARCHAR(10)  NOT NULL,
    max_marks      INT          NOT NULL,
    passing_marks  INT          NOT NULL DEFAULT 0,
    PRIMARY KEY (component_id),
    FOREIGN KEY (subject_id) REFERENCES Subject(subject_id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- Marks table (per student, per component)
CREATE TABLE IF NOT EXISTS Marks (
    mark_id        INT  NOT NULL AUTO_INCREMENT,
    roll_no        INT  NOT NULL,
    component_id   INT  NOT NULL,
    semester       INT  NOT NULL,
    obtained_marks INT  NOT NULL DEFAULT 0,
    credits_earned INT  NOT NULL DEFAULT 0,
    PRIMARY KEY (mark_id),
    UNIQUE KEY uq_marks (roll_no, component_id, semester),
    FOREIGN KEY (roll_no)      REFERENCES Student(roll_no)      ON DELETE CASCADE,
    FOREIGN KEY (component_id) REFERENCES Component(component_id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- ============================================================
-- SAMPLE DATA (pre-loaded for testing)
-- ============================================================

-- Students
INSERT INTO Student (roll_no, name, seat_no, category, year, semester) VALUES
(2502610, 'Ronit Patil', '1', 'OBC', 2, 3),
(2502611, 'Omkar Pawar', '2', 'General', 2, 3),
(2502624, 'Yash Palde', '3', 'General', 2, 3);

-- Subjects (Semester 3)
INSERT INTO Subject (subject_id, subject_name, credits, semester) VALUES
('2343111', 'Applied Mathematics', 3, 3),
('2343112', 'Advance Data Structure', 3, 3),
('2343113', 'Database Management System', 3, 3),
('2343114', 'Automata Theory', 3, 3),
('2343115', 'ADSA Lab', 1, 3),
('2343116', 'SQL Lab', 1, 3),
('2343611', 'Mini Project', 2, 3),
('2993511', 'Entrepreneurship Development', 2, 3),
('2993512', 'Environmental Science', 2, 3);

-- Components
INSERT INTO Component (subject_id, component_name, max_marks, passing_marks) VALUES
('2343111', 'I1', 40, 16),
('2343111', 'E1', 60, 24),
('2343111', 'T1', 25, 10),
('2343112', 'I1', 40, 16),
('2343112', 'E1', 60, 24),
('2343113', 'I1', 40, 16),
('2343113', 'E1', 60, 24),
('2343114', 'I1', 40, 16),
('2343114', 'E1', 60, 24),
('2343115', 'T1', 25, 10),
('2343115', 'O1', 25, 10),
('2343116', 'T1', 25, 10),
('2343116', 'O1', 25, 10),
('2343611', 'T1', 50, 20),
('2343611', 'O1', 25, 10),
('2993511', 'T1', 50, 20),
('2993512', 'T1', 50, 20);

-- Marks for Ronit (2502610) - All pass
INSERT INTO Marks (roll_no, component_id, semester, obtained_marks, credits_earned) VALUES
(2502610, 1, 3, 38, 3),
(2502610, 2, 3, 55, 3),
(2502610, 3, 3, 24, 3),
(2502610, 4, 3, 36, 3),
(2502610, 5, 3, 56, 3),
(2502610, 6, 3, 34, 3),
(2502610, 7, 3, 50, 3),
(2502610, 8, 3, 30, 3),
(2502610, 9, 3, 44, 3),
(2502610, 10, 3, 23, 1),
(2502610, 11, 3, 22, 1),
(2502610, 12, 3, 24, 1),
(2502610, 13, 3, 21, 1),
(2502610, 14, 3, 46, 2),
(2502610, 15, 3, 22, 2),
(2502610, 16, 3, 45, 2),
(2502610, 17, 3, 40, 2);

-- Marks for Omkar (2502611) - Has backlogs
INSERT INTO Marks (roll_no, component_id, semester, obtained_marks, credits_earned) VALUES
(2502611, 1, 3, 28, 2),
(2502611, 2, 3, 41, 2),
(2502611, 3, 3, 18, 2),
(2502611, 4, 3, 14, 0),
(2502611, 5, 3, 38, 0),
(2502611, 6, 3, 26, 3),
(2502611, 7, 3, 38, 3),
(2502611, 8, 3, 22, 0),
(2502611, 9, 3, 20, 0),
(2502611, 10, 3, 20, 1),
(2502611, 11, 3, 19, 1),
(2502611, 12, 3, 21, 1),
(2502611, 13, 3, 17, 1),
(2502611, 14, 3, 38, 2),
(2502611, 15, 3, 20, 2),
(2502611, 16, 3, 42, 2),
(2502611, 17, 3, 35, 2);
