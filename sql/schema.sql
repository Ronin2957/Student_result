-- ============================================================
-- PARADIGM STUDENT RESULT SYSTEM
-- MySQL Schema — Component-Based Marks System
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
-- TABLE 3: Component
-- Each subject can have multiple assessment components
-- (e.g. I1 = Internal, E1 = External, T1 = Term Work, O1 = Oral)
-- ============================================================
CREATE TABLE IF NOT EXISTS Component (
    component_id   INT          NOT NULL AUTO_INCREMENT,
    subject_id     VARCHAR(20)  NOT NULL,
    component_name VARCHAR(10)  NOT NULL,
    max_marks      INT          NOT NULL,
    passing_marks  INT          NOT NULL DEFAULT 0,
    PRIMARY KEY (component_id),
    CONSTRAINT fk_comp_subject FOREIGN KEY (subject_id) REFERENCES Subject(subject_id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- ============================================================
-- TABLE 4: Marks
-- Per-student, per-component obtained marks
-- ============================================================
CREATE TABLE IF NOT EXISTS Marks (
    mark_id        INT  NOT NULL AUTO_INCREMENT,
    roll_no        INT  NOT NULL,
    component_id   INT  NOT NULL,
    semester       INT  NOT NULL,
    obtained_marks INT  NOT NULL DEFAULT 0,
    credits_earned INT  NOT NULL DEFAULT 0,
    PRIMARY KEY (mark_id),
    UNIQUE KEY uq_marks (roll_no, component_id, semester),
    CONSTRAINT fk_marks_student   FOREIGN KEY (roll_no)      REFERENCES Student(roll_no)      ON DELETE CASCADE,
    CONSTRAINT fk_marks_component FOREIGN KEY (component_id)  REFERENCES Component(component_id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- ============================================================
-- TABLE 5: Result  (populated via Prolog queries)
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
