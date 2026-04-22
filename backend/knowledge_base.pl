
% SCHOLASTIC RESULT ANALYSIS 
% Knowledge Base: Facts (data) + Rules (analysis logic)

% Fact formats:
%   student(RollNo, Name, SeatNo, Category, Year, Semester).
%   subject(SubjectId, SubjectName, Credits, Semester).
%   component(SubjectId, ComponentName, MaxMarks, PassingMarks).
%   marks(RollNo, SubjectId, Semester, ComponentName, MaxMarks, PassingMarks, Obtained, CreditsEarned).


:- discontiguous student/6.
:- discontiguous subject/4.
:- discontiguous component/4.
:- discontiguous marks/8.


% SECTION 1: FACTS (auto-generated — replaced by Python)

% --- facts start ---
student(2502610, 'Ronit Patil', '1', 'OBC', 2, 3).
student(2502611, 'Omkar Pawar', '2', 'General', 2, 3).
student(2502624, 'Yash Palde', '3', 'General', 2, 3).

subject('2343111', 'Applied Mathematics', 3, 3).
subject('2343112', 'Advance Data Structure', 3, 3).
subject('2343113', 'Database Management System', 3, 3).
subject('2343114', 'Automata Theory', 3, 3).
subject('2343115', 'ADSA Lab', 1, 3).
subject('2343116', 'SQL Lab', 1, 3).
subject('2343611', 'Mini Project', 2, 3).
subject('2993511', 'Entrepreneurship Development', 2, 3).
subject('2993512', 'Environmental Science', 2, 3).

component('2343111', 'I1', 40, 16).
component('2343111', 'E1', 60, 24).
component('2343111', 'T1', 25, 10).
component('2343112', 'I1', 40, 16).
component('2343112', 'E1', 60, 24).
component('2343113', 'I1', 40, 16).
component('2343113', 'E1', 60, 24).
component('2343114', 'I1', 40, 16).
component('2343114', 'E1', 60, 24).
component('2343115', 'T1', 25, 10).
component('2343115', 'O1', 25, 10).
component('2343116', 'T1', 25, 10).
component('2343116', 'O1', 25, 10).
component('2343611', 'T1', 50, 20).
component('2343611', 'O1', 25, 10).
component('2993511', 'T1', 50, 20).
component('2993512', 'T1', 50, 20).

marks(2502610, '2343111', 3, 'I1', 40, 16, 38, 3).
marks(2502610, '2343111', 3, 'E1', 60, 24, 55, 3).
marks(2502610, '2343111', 3, 'T1', 25, 10, 24, 3).
marks(2502610, '2343112', 3, 'I1', 40, 16, 36, 3).
marks(2502610, '2343112', 3, 'E1', 60, 24, 56, 3).
marks(2502610, '2343113', 3, 'I1', 40, 16, 34, 3).
marks(2502610, '2343113', 3, 'E1', 60, 24, 50, 3).
marks(2502610, '2343114', 3, 'I1', 40, 16, 30, 3).
marks(2502610, '2343114', 3, 'E1', 60, 24, 44, 3).
marks(2502610, '2343115', 3, 'T1', 25, 10, 23, 1).
marks(2502610, '2343115', 3, 'O1', 25, 10, 22, 1).
marks(2502610, '2343116', 3, 'T1', 25, 10, 24, 1).
marks(2502610, '2343116', 3, 'O1', 25, 10, 21, 1).
marks(2502610, '2343611', 3, 'T1', 50, 20, 46, 2).
marks(2502610, '2343611', 3, 'O1', 25, 10, 22, 2).
marks(2502610, '2993511', 3, 'T1', 50, 20, 45, 2).
marks(2502610, '2993512', 3, 'T1', 50, 20, 40, 2).

marks(2502611, '2343111', 3, 'I1', 40, 16, 28, 2).
marks(2502611, '2343111', 3, 'E1', 60, 24, 41, 2).
marks(2502611, '2343111', 3, 'T1', 25, 10, 18, 2).
marks(2502611, '2343112', 3, 'I1', 40, 16, 14, 0).
marks(2502611, '2343112', 3, 'E1', 60, 24, 38, 0).
marks(2502611, '2343113', 3, 'I1', 40, 16, 26, 3).
marks(2502611, '2343113', 3, 'E1', 60, 24, 38, 3).
marks(2502611, '2343114', 3, 'I1', 40, 16, 22, 0).
marks(2502611, '2343114', 3, 'E1', 60, 24, 20, 0).
marks(2502611, '2343115', 3, 'T1', 25, 10, 20, 1).
marks(2502611, '2343115', 3, 'O1', 25, 10, 19, 1).
marks(2502611, '2343116', 3, 'T1', 25, 10, 21, 1).
marks(2502611, '2343116', 3, 'O1', 25, 10, 17, 1).
marks(2502611, '2343611', 3, 'T1', 50, 20, 38, 2).
marks(2502611, '2343611', 3, 'O1', 25, 10, 20, 2).
marks(2502611, '2993511', 3, 'T1', 50, 20, 42, 2).
marks(2502611, '2993512', 3, 'T1', 50, 20, 35, 2).
% --- facts end ---


% SECTION 2: RULES (predefined analysis logic)


% --- Check if a component is failed ---
component_failed(RollNo, SubId, Semester, CompName) :-
    marks(RollNo, SubId, Semester, CompName, _, PassMin, Obtained, _),
    PassMin > 0,
    Obtained < PassMin.

% --- Subject total marks ---
subject_total(RollNo, SubId, Semester, Total) :-
    findall(Obt, marks(RollNo, SubId, Semester, _, _, _, Obt, _), ObtList),
    ObtList \= [],
    sumlist(ObtList, Total).

% --- Subject max marks ---
subject_max(RollNo, SubId, Semester, MaxTotal) :-
    findall(Max, marks(RollNo, SubId, Semester, _, Max, _, _, _), MaxList),
    MaxList \= [],
    sumlist(MaxList, MaxTotal).

% --- Subject percentage ---
subject_percentage(RollNo, SubId, Semester, Pct) :-
    subject_total(RollNo, SubId, Semester, Total),
    subject_max(RollNo, SubId, Semester, MaxTotal),
    MaxTotal > 0,
    Pct is (Total / MaxTotal) * 100.

% --- Pass/fail checks ---
passes_subject(RollNo, SubId, Semester) :-
    marks(RollNo, SubId, Semester, _, _, _, _, _),
    \+ component_failed(RollNo, SubId, Semester, _).

fails_subject(RollNo, SubId, Semester) :-
    component_failed(RollNo, SubId, Semester, _).

% --- Grade points (10-point scale) ---
grade_points(Pct, 10) :- Pct >= 91, !.
grade_points(Pct,  9) :- Pct >= 81, !.
grade_points(Pct,  8) :- Pct >= 71, !.
grade_points(Pct,  7) :- Pct >= 61, !.
grade_points(Pct,  6) :- Pct >= 55, !.
grade_points(Pct,  5) :- Pct >= 50, !.
grade_points(Pct,  4) :- Pct >= 40, !.
grade_points(_,     0).

% --- Unique subjects in a semester ---
semester_subjects(RollNo, Semester, Subjects) :-
    findall(SubId, marks(RollNo, SubId, Semester, _, _, _, _, _), RawList),
    sort(RawList, Subjects).

% --- SGPA Calculation ---
sgpa(RollNo, Semester, SGPA) :-
    semester_subjects(RollNo, Semester, Subjects),
    Subjects \= [],
    compute_wgp(RollNo, Semester, Subjects, 0, 0, TotalWGP, TotalCr),
    TotalCr > 0,
    SGPA is TotalWGP / TotalCr.

compute_wgp(_, _, [], WAcc, CAcc, WAcc, CAcc).
compute_wgp(RollNo, Semester, [SubId | Rest], WAcc, CAcc, WSum, CrSum) :-
    subject(SubId, _, Cr, _),
    subject_percentage(RollNo, SubId, Semester, Pct),
    grade_points(Pct, GP),
    WAcc1 is WAcc + GP * Cr,
    CAcc1 is CAcc + Cr,
    compute_wgp(RollNo, Semester, Rest, WAcc1, CAcc1, WSum, CrSum).

% --- Total Credits Earned ---
total_credits(RollNo, Semester, TotalCredits) :-
    findall(SubId-Cr,
        ( marks(RollNo, SubId, Semester, _, _, _, _, _),
          passes_subject(RollNo, SubId, Semester),
          subject(SubId, _, Cr, _) ),
        RawPairs),
    sort(RawPairs, UniquePairs),
    sum_pair_credits(UniquePairs, 0, TotalCredits).

sum_pair_credits([], Acc, Acc).
sum_pair_credits([_-Cr | Rest], Acc, Total) :-
    Acc1 is Acc + Cr,
    sum_pair_credits(Rest, Acc1, Total).

% --- Number of Backlogs ---
number_of_backlogs(RollNo, Semester, Count) :-
    findall(SubId,
        ( marks(RollNo, SubId, Semester, _, _, _, _, _),
          fails_subject(RollNo, SubId, Semester) ),
        RawList),
    sort(RawList, UniqueList),
    length(UniqueList, Count).

% --- Grace Marks ---
grace_used(RollNo, Semester, Grace) :-
    number_of_backlogs(RollNo, Semester, Count),
    ( Count =:= 1 ->
        findall(PassMin - Obtained,
            ( marks(RollNo, _, Semester, _, _, PassMin, Obtained, _),
              PassMin > 0,
              Obtained < PassMin ),
            FailedComps),
        sum_grace_needed(FailedComps, 0, TotalNeeded),
        ( TotalNeeded =< 6 -> Grace = TotalNeeded ; Grace = 0 )
    ;
        Grace = 0
    ).

sum_grace_needed([], Acc, Acc).
sum_grace_needed([PassMin - Obtained | Rest], Acc, Total) :-
    Needed is PassMin - Obtained,
    Acc1 is Acc + Needed,
    sum_grace_needed(Rest, Acc1, Total).

% --- Result Status ---
result_status(RollNo, Semester, Status) :-
    number_of_backlogs(RollNo, Semester, Count),
    grace_used(RollNo, Semester, Grace),
    ( Count =:= 0 ->
        Status = 'PASS'
    ; Count =:= 1, Grace > 0 ->
        Status = 'PASS (Grace)'
    ; Count =:= 1 ->
        Status = 'ATKT'
    ;
        Status = 'FAIL'
    ).
