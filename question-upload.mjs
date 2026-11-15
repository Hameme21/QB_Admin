// Shared filename detection for direct PDFs and files extracted from ZIP archives.
const normalize = value => String(value || '').toLowerCase()
    .replace(/&/g, ' and ').replace(/[^a-z0-9]+/g, ' ').trim().replace(/\s+/g, ' ');
const containsPhrase = (text, phrase) => (` ${text} `).includes(` ${normalize(phrase)} `);

export function detectQuestionMetadata(fullPath, fileName, curriculum, faculties = []) {
    const filePath = String(fullPath || fileName).replace(/\\/g, '/');
    const baseName = fileName.replace(/\.[^/.]+$/, '');
    const text = normalize(`${filePath.replace(/\.[^/.]+$/, '')} ${baseName}`);
    const isSolution = /\b(solution|solutions|sol|ans|answer|answers|solved)\b/.test(text);
    const subjects = new Set(curriculum.map(c => c.code.split(/\s+/)[0].toLowerCase()));
    const codeMatch = [...text.matchAll(/\b([a-z]{2,4})\s*(\d{4}[a-z]?)\b/g)]
        .find(match => subjects.has(match[1]));
    let course = null;
    if (codeMatch) {
        const code = `${codeMatch[1]} ${codeMatch[2]}`.toUpperCase();
        course = curriculum.find(c => c.code.replace(/\s/g, '').toUpperCase() === code.replace(/\s/g, ''))
            || { code, title: 'Unknown Course', trimester: '' };
    }
    if (!course) {
        // Prefer the longest match so "OOP Lab" and "DSA II" win over "OOP" and "DSA".
        const matches = curriculum.flatMap(c => [c.title, ...(c.aliases || [])]
            .filter(name => normalize(name).length >= 2 && containsPhrase(text, name))
            .map(name => ({ course: c, length: normalize(name).length })));
        matches.sort((a, b) => b.length - a.length);
        course = matches[0]?.course || null;
    }

    let examType = '';
    const quiz = text.match(/\b(?:quiz|q|ct|class test)\s*([1-4])\b/);
    if (quiz) examType = `Quiz ${quiz[1]}`;
    else if (/\b(midterm|mid term|mid)\b/.test(text)) examType = 'Midterm';
    else if (/\b(final|finals|final term|fin)\b/.test(text)) examType = 'Final';
    else if (/\b(quiz|class test|ct)\b/.test(text)) examType = 'Quiz';
    else if (/\b(assignment|hw)\s*\d*\b/.test(text)) examType = 'Assignment';
    else if (/\b(lab|laboratory)\b/.test(text)) examType = 'Lab';

    let materialType = isSolution ? 'Solution' : 'Question';
    let noteCategory = null;
    let noteTypeName = null;
    if (/\b(notes?|lecture notes?|summary|slides?)\b/.test(text) && !isSolution) {
        materialType = 'Notes';
        noteCategory = /\b(uni|university|central|uiu)\b/.test(text) ? 'university' : 'faculty';
        noteTypeName = noteCategory === 'university' ? "University's Notes" : "Faculty's Notes";
        examType = noteTypeName;
    }

    let semester = text.match(/\b(\d{2}[1-3])\b/)?.[1] || '';
    if (!semester) {
        const seasonPattern = '(spring|summer|fall|autumn|sp|su|fa)';
        const yearPattern = '(20\\d{2}|\\d{2})';
        const forward = text.match(new RegExp(`\\b${seasonPattern}\\s*${yearPattern}\\b`));
        const reverse = text.match(new RegExp(`\\b${yearPattern}\\s*${seasonPattern}\\b`));
        const season = forward?.[1] || reverse?.[2];
        const year = forward?.[2] || reverse?.[1];
        if (season && year) {
            const term = season.startsWith('su') ? '2' : /^(fa|au)/.test(season) ? '3' : '1';
            semester = `${year.slice(-2)}${term}`;
        }
    }
    const trimMatch = text.match(/\b(?:trimester|tri|t)\s*(1[0-2]|[0-9])\b/);
    const trimester = trimMatch ? Number(trimMatch[1]) : (course?.trimester ?? '');
    const faculty = faculties.find(f => f.code && containsPhrase(text, f.code))
        || faculties.find(f => f.name && containsPhrase(text, f.name));
    const semesterLabel = semester
        ? `${['Spring', 'Summer', 'Fall'][Number(semester[2]) - 1]} 20${semester.slice(0, 2)} (${semester})` : '';
    const topic = materialType === 'Notes' ? baseName.replace(/[_]+/g, ' ').trim()
        : `${examType} ${materialType} ${semesterLabel}`.trim();

    return {
        isSolution, courseCode: course?.code || '', courseName: course?.title || '',
        examType, materialType, noteCategory, noteTypeName, semester, trimester, topic,
        facultyId: faculty?.id ?? null, facultyName: faculty?.name || '', facultyCode: faculty?.code || '',
        originalFilename: fileName, filePath
    };
}

export function matchesQuestionSolution(question, solution) {
    if (question === solution || question.materialType !== 'Question') return false;
    const coreName = item => normalize(item.originalFilename.replace(/\.[^/.]+$/, ''))
        .replace(/\b(solution|solutions|sol|ans|answer|answers|solved)\b/g, '').replace(/\s+/g, ' ').trim();
    const sameName = coreName(question) && coreName(question) === coreName(solution);
    const sameMetadata = question.courseCode && question.examType && question.semester
        && question.courseCode === solution.courseCode && question.examType === solution.examType
        && question.semester === solution.semester
        && (!question.facultyCode || !solution.facultyCode || question.facultyCode === solution.facultyCode);
    return Boolean(sameName || sameMetadata);
}

export function missingQuestionDetails(item) {
    return ['courseCode', 'examType', 'semester', 'trimester']
        .filter(key => item[key] === '' || item[key] === null || item[key] === undefined);
}
