import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import { detectQuestionMetadata, matchesQuestionSolution, missingQuestionDetails } from './question-upload.mjs';

const html = readFileSync(new URL('./index.html', import.meta.url), 'utf8');
const curriculumSource = html.slice(html.indexOf('const CURRICULUM = ['), html.indexOf('function isLabCourse('));
const curriculum = vm.runInNewContext(`${curriculumSource}; CURRICULUM`);
const faculties = [{ id: 7, name: 'Test Faculty', code: 'TF' }];
const parse = name => detectQuestionMetadata(name, name.split('/').pop(), curriculum, faculties);

test('detects course codes, aliases, full titles, semesters, exams and explicit trimesters', () => {
    const cases = [
        ['CSE 1115_Midterm_241.pdf', 'CSE 1115', 'Midterm', '241', 4],
        ['OOP_Mid_251.pdf', 'CSE 1115', 'Midterm', '251', 4],
        ['DLD_Final_233.pdf', 'CSE 1325', 'Final', '233', 4],
        ['DSA_Quiz1_242.pdf', 'CSE 2215', 'Quiz 1', '242', 3],
        ['DSA II_Quiz_3_242.pdf', 'CSE 2217', 'Quiz 3', '242', 5],
        ['Object Oriented Programming_Final_Fall 2024_Trimester 12.pdf', 'CSE 1115', 'Final', '243', 12],
        ['MATH 2201 - Final Exam - Spring 2024.pdf', 'MATH 2201', 'Final', '241', 4],
        ['DBMS/241/Final.pdf', 'CSE 3521', 'Final', '241', 6],
        ['OOP_Lab_Final_2024_Summer_TF.pdf', 'CSE 1116', 'Final', '242', 4],
        ['Economics_Final_Spring2024.pdf', 'ECO 4101', 'Final', '241', 0],
        ['CSE_1115_CT_2_241_T10.pdf', 'CSE 1115', 'Quiz 2', '241', 10],
    ];
    for (const [name, courseCode, examType, semester, trimester] of cases) {
        const item = parse(name);
        assert.deepEqual([item.courseCode, item.examType, item.semester, item.trimester],
            [courseCode, examType, semester, trimester], name);
        assert.equal(missingQuestionDetails(item).length, 0);
    }
    assert.equal(parse('OOP_Final_241.pdf').courseName, 'Object Oriented Programming');
    assert.equal(parse('OOP_Lab_Final_241_TF.pdf').facultyId, 7);
});

test('keeps unrecognized details blank and preserves elective trimester zero', () => {
    assert.deepEqual(missingQuestionDetails(parse('scan.pdf')), ['courseCode', 'examType', 'semester', 'trimester']);
    assert.deepEqual(missingQuestionDetails(parse('OOP.pdf')), ['examType', 'semester']);
    assert.equal(parse('Final_Fall 2024.pdf').courseCode, '');
    assert.equal(parse('Economics_Final_241.pdf').trimester, 0);
});

test('recognizes solutions without self-pairing and uses complete metadata to pair', () => {
    const question = parse('OOP_Mid_251.pdf');
    const solution = parse('OOP_Mid_251_solution.pdf');
    assert.equal(solution.materialType, 'Solution');
    assert.ok(matchesQuestionSolution(question, solution));
    assert.equal(matchesQuestionSolution(solution, solution), false);
    assert.equal(matchesQuestionSolution(parse('scan.pdf'), parse('answer.pdf')), false);
    assert.equal(matchesQuestionSolution(question, parse('OOP_Final_251_solution.pdf')), false);
});

// Run the real batch handlers with in-memory DOM/storage adapters. No live assets are published.
function makeUploader() {
    class Element {
        style = {}; options = []; dataset = {}; listeners = {}; children = [];
        innerHTML = ''; textContent = ''; value = ''; disabled = false;
        classList = { add() {}, remove() {} };
        addEventListener(name, callback) { this.listeners[name] = callback; }
        appendChild(child) { this.children.push(child); }
    }
    const elements = new Map();
    const document = {
        getElementById(id) {
            if (!elements.has(id)) elements.set(id, new Element());
            return elements.get(id);
        },
        querySelectorAll: () => [], createElement: () => new Element(), body: new Element()
    };
    const writes = [], uploads = [], toasts = [];
    const context = vm.createContext({
        document, window: {}, File, console, Date, Option: class {},
        detectQuestionMetadata, matchesQuestionSolution, missingQuestionDetails,
        CURRICULUM: curriculum, facultiesList: faculties, ADMIN_SEMESTERS: [{ code: '241', label: 'Spring 2024' }],
        allSubmissions: [], currentUser: { email: 'test@example.com' }, db: {},
        QUESTION_COLLECTION: 'questions', AUDIT_COLLECTION: 'audit',
        adminUploadModal: new Element(), isDocApproved: () => true,
        isLabCourse: code => curriculum.some(c => c.code === (code?.code || code) && c.credits === 1),
        getCourseTitle: code => curriculum.find(c => c.code === code)?.title || 'Unknown Course',
        decodeSemester: code => code, extractNoteTopicFromFileName: name => name,
        updateAdminUploadTypeUI() {}, updateAdminFacultyRequirementUI() {},
        showToast: (...args) => toasts.push(args), confirm: () => true, fetchSubmissions() {},
        BackgroundUploadManager: { async start() {}, updateTitle() {}, async delay() {}, stop() {} },
        collection: (_, name) => name, serverTimestamp: () => 'timestamp',
        async addDoc(collection, data) { writes.push({ collection, data }); return { id: String(writes.length) }; },
        async uploadToCloudinary(type, file, courseCode) {
            uploads.push({ type, file, courseCode });
            return { pdfUrl: `https://example.test/${encodeURIComponent(file.name)}`, originalFilename: file.name };
        }
    });
    const bulkStart = html.indexOf("        const openAdminZipUploadBtn =");
    const bulkEnd = html.indexOf('    </script>', bulkStart);
    vm.runInContext(html.slice(bulkStart, bulkEnd) + '\n globalThis.queue = () => parsedZipEntries;', context);
    return { context, elements, writes, uploads, toasts, select: files => context.handleZipFileSelection(files) };
}

const pdf = (name, size = 32) => new File([new Uint8Array(size)], name, { type: 'application/pdf' });

test('multiple native PDFs reach review and publish with individual metadata and solution assets', async () => {
    const app = makeUploader();
    await app.select([pdf('OOP_Mid_241.pdf'), pdf('DLD_Final_242.pdf'), pdf('OOP_Mid_241_sol.pdf')]);
    assert.equal(app.context.queue().length, 2);
    assert.equal(app.context.queue()[0].pairedSolution.originalFilename, 'OOP_Mid_241_sol.pdf');
    assert.equal(app.elements.get('zip-review-section').style.display, 'flex');
    await app.elements.get('btn-start-zip-upload').listeners.click();
    const saved = app.writes.filter(write => write.collection === 'questions').map(write => write.data);
    assert.equal(saved.length, 2);
    assert.deepEqual(saved.map(item => item.courseCode), ['CSE 1115', 'CSE 1325']);
    assert.deepEqual(saved.map(item => item.semester), ['241', '242']);
    assert.equal(saved[0].trimester, 4);
    assert.equal(saved[0].materialAssets.length, 2);
    assert.equal(app.uploads[1].type, 'solution');
    assert.equal(saved[0].originalFilename, 'OOP_Mid_241.pdf');
    assert.equal(app.context.queue().length, 0);
});

test('rejects oversized and unsupported inputs, avoids repeated files, appends batches', async () => {
    const app = makeUploader();
    await Promise.all([
        app.select([pdf('OOP_Final_241.pdf'), pdf('large.pdf', 5 * 1024 * 1024 + 1), pdf('ignored.txt')]),
        app.select([pdf('OOP_Final_241.pdf'), pdf('Economics_Final_241.pdf')])
    ]);
    assert.equal(app.context.queue().length, 2);
    assert.ok(app.toasts.some(([message]) => message.includes('5MB')));
    assert.ok(app.toasts.some(([message]) => message.includes('Only PDF and ZIP')));
    await app.elements.get('btn-start-zip-upload').listeners.click();
    assert.equal(app.writes.find(write => write.data.courseCode === 'ECO 4101').data.trimester, 0);
});

test('blocks incomplete details and faculty-less lab courses before uploading', async () => {
    for (const name of ['scan.pdf', 'OOP_Lab_Final_241.pdf']) {
        const app = makeUploader();
        await app.select([pdf(name)]);
        await app.elements.get('btn-start-zip-upload').listeners.click();
        assert.equal(app.uploads.length, 0);
        assert.equal(app.writes.length, 0);
        assert.equal(app.toasts.at(-1)[1], 'error');
    }
});

test('standalone solutions publish once as solutions', async () => {
    const app = makeUploader();
    await app.select([pdf('OOP_Mid_241_solution.pdf')]);
    assert.equal(app.context.queue()[0].pairedSolution, undefined);
    await app.elements.get('btn-start-zip-upload').listeners.click();
    assert.equal(app.uploads.length, 1);
    assert.equal(app.uploads[0].type, 'solution');
    assert.equal(app.writes[0].data.type, 'Solution');
});

test('mixed ZIP and PDF selections retain archive extraction and solution pairing', async () => {
    const app = makeUploader();
    const entry = name => ({ dir: false, async: async () => new Blob([name]) });
    app.context.JSZip = class {
        async loadAsync() {
            return { files: {
                'DBMS/241/Final.pdf': entry('question'),
                'DBMS/241/Final_sol.pdf': entry('solution'),
                '__MACOSX/noise.pdf': entry('ignored')
            } };
        }
    };
    app.context.Blob = Blob;
    await app.select([pdf('OOP_Final_241.pdf'), new File(['zip'], 'questions.zip')]);
    assert.equal(app.context.queue().length, 2);
    assert.equal(app.context.queue()[1].courseCode, 'CSE 3521');
    await app.elements.get('btn-start-zip-upload').listeners.click();
    assert.equal(app.uploads.length, 3);
    assert.ok(app.uploads.every(item => item.file.type === 'application/pdf'));
    assert.equal(app.writes.filter(write => write.collection === 'questions').length, 2);
});

test('failed files stay in the queue for retry while published files are removed', async () => {
    const app = makeUploader();
    app.context.console = { ...console, error() {} };
    const originalUpload = app.context.uploadToCloudinary;
    app.context.uploadToCloudinary = (...args) => {
        if (args[1].name.startsWith('DLD')) throw new Error('Simulated upload failure');
        return originalUpload(...args);
    };
    await app.select([pdf('OOP_Final_241.pdf'), pdf('DLD_Final_241.pdf')]);
    await app.elements.get('btn-start-zip-upload').listeners.click();
    assert.equal(app.context.queue().length, 1);
    assert.equal(app.context.queue()[0].originalFilename, 'DLD_Final_241.pdf');
    assert.equal(app.context.queue()[0].selected, true);
    app.context.uploadToCloudinary = originalUpload;
    await app.elements.get('btn-start-zip-upload').listeners.click();
    assert.equal(app.context.queue().length, 0);
    assert.equal(app.writes.filter(write => write.collection === 'questions').length, 2);
});

test('module JavaScript parses successfully', () => {
    const moduleScript = html.match(/<script type="module">([\s\S]*?)<\/script>/)[1];
    const withoutImports = moduleScript.replace(/^\s*import[\s\S]*?from\s*['"][^'"]+['"];\s*$/gm, '');
    assert.doesNotThrow(() => new vm.Script(withoutImports));
});
