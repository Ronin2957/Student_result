-- ============================================================
-- PARADIGM STUDENT RESULT SYSTEM
-- MySQL Schema — 4 Normalized Tables
-- Run this in phpMyAdmin or MySQL CLI after starting XAMPP
-- ============================================================

CREATE DATABASE IF NOT EXISTS paradigm_result
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE paradigm_result;

-- ============================================================
-- TABLE 1: Student
-- ============================================================
CREATE TABLE IF NOT EXISTS Student (
    roll_no     INT          NOT NULL,
    name        VARCHAR(100) NOT NULL,
    seat_no     VARCHAR(20)  NOT NULL,
    category    VARCHAR(30)  NOT NULL DEFAULT 'General',
    year        INT          NOT NULL,
    semester    INT          NOT NULL,
    PRIMARY KEY (roll_no)
) ENGINE=InnoDB;

-- ============================================================
-- TABLE 2: Subject
-- ============================================================
CREATE TABLE IF NOT EXISTS Subject (
    subject_id   VARCHAR(20)  NOT NULL,
    subject_name VARCHAR(100) NOT NULL,
    credits      INT          NOT NULL,
    semester     INT          NOT NULL DEFAULT 1,
    PRIMARY KEY (subject_id)
) ENGINE=InnoDB;

-- ============================================================
-- TABLE 3: Marks
-- Passing: CIE >= 18 (out of 40), ESE >= 24 (out of 60)
-- total_marks = cie_marks + ese_marks (out of 100)
-- ============================================================
CREATE TABLE IF NOT EXISTS Marks (
    roll_no        INT         NOT NULL,
    subject_id     VARCHAR(20) NOT NULL,
    semester       INT         NOT NULL,
    cie_marks      INT         NOT NULL DEFAULT 0,
    ese_marks      INT         NOT NULL DEFAULT 0,
    credits_earned INT         NOT NULL DEFAULT 0,
    total_marks    INT         GENERATED ALWAYS AS (cie_marks + ese_marks) STORED,
    PRIMARY KEY (roll_no, subject_id, semester),
    CONSTRAINT fk_marks_student  FOREIGN KEY (roll_no)     REFERENCES Student(roll_no)    ON DELETE CASCADE,
    CONSTRAINT fk_marks_subject  FOREIGN KEY (subject_id)  REFERENCES Subject(subject_id) ON DELETE CASCADE,
    CONSTRAINT chk_cie  CHECK (cie_marks  BETWEEN 0 AND 40),
    CONSTRAINT chk_ese  CHECK (ese_marks  BETWEEN 0 AND 60)
) ENGINE=InnoDB;

-- ============================================================
-- TABLE 4: Result  (populated via Prolog queries)
-- ============================================================
CREATE TABLE IF NOT EXISTS Result (
    roll_no            INT          NOT NULL,
    semester           INT          NOT NULL,
    sgpa               DECIMAL(4,2) DEFAULT NULL,
    total_credits      INT          DEFAULT NULL,
    grace_used         INT          DEFAULT 0,
    result_status      VARCHAR(30)  DEFAULT NULL,
    number_of_backlogs INT          DEFAULT 0,
    computed_at        TIMESTAMP    DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (roll_no, semester),
    CONSTRAINT fk_result_student FOREIGN KEY (roll_no) REFERENCES Student(roll_no) ON DELETE CASCADE
) ENGINE=InnoDB;
