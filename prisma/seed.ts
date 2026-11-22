// Все люди, группы, оценки и номера в этом файле вымышлены.
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const db = new PrismaClient();

const TZ = "Europe/Moscow";
function moscowIso(date = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: TZ, year: "numeric", month: "2-digit", day: "2-digit" }).format(date);
}
function addDays(iso: string, n: number): string {
  const [y, m, d] = iso.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  dt.setUTCDate(dt.getUTCDate() + n);
  return dt.toISOString().slice(0, 10);
}
function weekday(iso: string): number {
  const [y, m, d] = iso.split("-").map(Number);
  const w = new Date(Date.UTC(y, m - 1, d)).getUTCDay();
  return w === 0 ? 7 : w;
}
function isoWeek(iso: string): number {
  const [y, m, d] = iso.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  const day = dt.getUTCDay() || 7;
  dt.setUTCDate(dt.getUTCDate() + 4 - day);
  const ys = new Date(Date.UTC(dt.getUTCFullYear(), 0, 1));
  return Math.ceil(((dt.getTime() - ys.getTime()) / 86400000 + 1) / 7);
}
const parity = (iso: string) => (isoWeek(iso) % 2 === 1 ? "NUM" : "DEN");
const hoursAgo = (h: number) => new Date(Date.now() - h * 3600_000);

const S = {
  1: ["08:30", "10:05"],
  2: ["10:15", "11:50"],
  3: ["12:50", "14:25"],
  4: ["14:35", "16:10"],
  5: ["16:20", "17:55"],
} as const;

type Row = [number, "BOTH" | "NUM" | "DEN", 1 | 2 | 3 | 4 | 5, string, string, string, string, string?];

const G_SOFIA = "МО-3-21";
const G_ARTEM = "МП-1-15";

const sofiaRows: Row[] = [
  [1, "BOTH", 2, "Криптографические методы защиты информации", "Лекция", "505л", "доц. Тарасов В. Н."],
  [1, "BOTH", 3, "Операционные системы", "Лабораторная", "218м", "ст. преп. Мельникова Е. А.", "Лабораторная №5: методичка и шаблон отчёта"],
  [1, "NUM", 4, "Сети и телекоммуникации", "Лекция", "430л", "проф. Громов С. И."],
  [1, "DEN", 4, "Сети и телекоммуникации", "Семинар", "430л", "проф. Громов С. И."],
  [2, "BOTH", 1, "Теория информации", "Лекция", "312л", "доц. Ершова Н. П."],
  [2, "NUM", 2, "Безопасность баз данных", "Лекция", "312л", "доц. Кравцов Д. А."],
  [2, "DEN", 2, "Безопасность баз данных", "Лабораторная", "301м", "доц. Кравцов Д. А."],
  [2, "BOTH", 4, "Иностранный язык", "Семинар", "112ю", "ст. преп. Рябова О. К."],
  [3, "BOTH", 2, "Операционные системы", "Лекция", "505л", "проф. Белозёров И. М."],
  [3, "NUM", 3, "Криптографические методы защиты информации", "Семинар", "418м", "доц. Тарасов В. Н."],
  [3, "DEN", 3, "Теория информации", "Семинар", "418м", "доц. Ершова Н. П."],
  [4, "BOTH", 1, "Сети и телекоммуникации", "Лабораторная", "214м", "ст. преп. Сидоренко А. В.", "Лабораторная №3: топология и задание"],
  [4, "BOTH", 2, "Безопасность баз данных", "Семинар", "301м", "доц. Кравцов Д. А."],
  [4, "NUM", 3, "Основы права в информационной безопасности", "Лекция", "505л", "доц. Лаврентьева Т. Ю."],
  [5, "DEN", 2, "Теория информации", "Лабораторная", "218м", "ст. преп. Мельникова Е. А."],
  [5, "BOTH", 3, "Иностранный язык", "Семинар", "112ю", "ст. преп. Рябова О. К."],
  [5, "DEN", 4, "Основы права в информационной безопасности", "Семинар", "505л", "доц. Лаврентьева Т. Ю."],
  [5, "NUM", 4, "Криптографические методы защиты информации", "Лабораторная", "218м", "доц. Тарасов В. Н.", "Лабораторная №2: описание шифра"],
  // Суббота — 3 пары
  [6, "BOTH", 1, "Элективный курс по физической культуре", "Практика", "Спорткомплекс", "преп. Орехов П. С."],
  [6, "BOTH", 2, "Операционные системы", "Консультация", "505л", "проф. Белозёров И. М.", "Разбор лабораторной №5"],
  [6, "BOTH", 3, "Криптографические методы защиты информации", "Семинар", "418м", "доц. Тарасов В. Н."],
  // Воскресенье — 3 пары (интенсив / выездные)
  [7, "BOTH", 2, "Сети и телекоммуникации", "Лабораторная", "214м", "ст. преп. Сидоренко А. В.", "Практика Wireshark"],
  [7, "BOTH", 3, "Теория информации", "Семинар", "312л", "доц. Ершова Н. П."],
  [7, "BOTH", 4, "Безопасность баз данных", "Консультация", "301м", "доц. Кравцов Д. А."],
];

const artemRows: Row[] = [
  [1, "BOTH", 1, "Математический анализ", "Лекция", "Б-101", "проф. Данилов Р. Е."],
  [1, "BOTH", 2, "Линейная алгебра и геометрия", "Лекция", "Б-101", "доц. Фёдорова И. С."],
  [1, "NUM", 3, "Основы программирования", "Лабораторная", "212м", "ст. преп. Зуев К. Л.", "Лабораторная №2: условия и циклы, Python"],
  [1, "DEN", 3, "Физика", "Лекция", "Б-103", "проф. Макаров Г. Д."],
  [2, "NUM", 2, "История России", "Лекция", "А-305", "доц. Климова Л. Р."],
  [2, "DEN", 2, "История России", "Семинар", "А-308", "доц. Климова Л. Р."],
  [2, "BOTH", 3, "Иностранный язык", "Семинар", "112ю", "ст. преп. Рябова О. К."],
  [2, "BOTH", 4, "Математический анализ", "Семинар", "224л", "доц. Назаров А. П."],
  [3, "BOTH", 1, "Физика", "Лекция", "Б-101", "проф. Макаров Г. Д."],
  [3, "NUM", 2, "Основы программирования", "Лекция", "Б-103", "ст. преп. Зуев К. Л."],
  [3, "DEN", 2, "Основы программирования", "Лабораторная", "212м", "ст. преп. Зуев К. Л."],
  [3, "BOTH", 3, "Линейная алгебра и геометрия", "Семинар", "224л", "доц. Фёдорова И. С."],
  [4, "BOTH", 2, "Математический анализ", "Семинар", "224л", "доц. Назаров А. П."],
  [4, "NUM", 3, "Физика", "Лабораторная", "Ф-104", "ст. преп. Щербаков В. Н."],
  [4, "DEN", 3, "Основы программирования", "Лабораторная", "212м", "ст. преп. Зуев К. Л."],
  [5, "BOTH", 1, "Иностранный язык", "Семинар", "112ю", "ст. преп. Рябова О. К."],
  [5, "BOTH", 2, "Линейная алгебра и геометрия", "Лекция", "Б-101", "доц. Фёдорова И. С."],
  [5, "BOTH", 3, "Элективный курс по физической культуре", "Практика", "Спорткомплекс", "преп. Орехов П. С."],
  [6, "BOTH", 1, "Элективный курс по физической культуре", "Практика", "Спорткомплекс", "преп. Орехов П. С."],
  [6, "BOTH", 2, "Математический анализ", "Консультация", "224л", "доц. Назаров А. П."],
  [6, "BOTH", 3, "Основы программирования", "Лабораторная", "212м", "ст. преп. Зуев К. Л."],
  [7, "BOTH", 2, "Физика", "Лабораторная", "Ф-104", "ст. преп. Щербаков В. Н."],
  [7, "BOTH", 3, "Линейная алгебра и геометрия", "Семинар", "224л", "доц. Фёдорова И. С."],
  [7, "BOTH", 4, "История России", "Семинар", "А-308", "доц. Климова Л. Р."],
];

function lessonData(
  group: string,
  rows: Row[],
): {
  groupName: string;
  weekday: number;
  week: string;
  startTime: string;
  endTime: string;
  subject: string;
  kind: string;
  room: string;
  teacher: string;
  material: string | null;
}[] {
  return rows.map(([weekdayN, week, slot, subject, kind, room, teacher, material]) => ({
    groupName: group,
    weekday: weekdayN,
    week,
    startTime: S[slot][0],
    endTime: S[slot][1],
    subject,
    kind,
    room,
    teacher,
    material: material ?? null,
  }));
}

async function seedLessons() {
  if ((await db.lesson.count()) > 0) return;
  for (const [group, rows] of [
    [G_SOFIA, sofiaRows],
    [G_ARTEM, artemRows],
  ] as const) {
    await db.lesson.createMany({ data: lessonData(group, rows) });
  }
}

/** Обновляет шаблон сб/вс без полного ресида. */
async function syncWeekendLessons() {
  for (const [group, rows] of [
    [G_SOFIA, sofiaRows],
    [G_ARTEM, artemRows],
  ] as const) {
    const weekend = rows.filter(([wd]) => wd >= 6);
    await db.lesson.deleteMany({ where: { groupName: group, weekday: { in: [6, 7] } } });
    if (weekend.length) await db.lesson.createMany({ data: lessonData(group, weekend) });
  }
}

// Переносы пересчитываются от сегодняшней даты при каждом старте, чтобы они всегда были рядом с «сегодня».
async function refreshChanges() {
  await db.lessonChange.deleteMany();
  const today = moscowIso();
  for (const group of [G_SOFIA, G_ARTEM]) {
    const lessons = await db.lesson.findMany({ where: { groupName: group } });
    const reasons = [
      { cancelled: false, room: "505л", reason: "Замена аудитории: в прежней аудитории не работает проектор" },
      { cancelled: true, reason: "Пара отменена: преподаватель на научной конференции" },
      { cancelled: false, shift: ["14:35", "16:10"], reason: "Перенос по просьбе преподавателя, потоки объединены" },
    ];
    let picked = 0;
    for (let i = 0; i < 12 && picked < reasons.length; i++) {
      const iso = addDays(today, i);
      const wd = weekday(iso);
      const day = lessons.filter((l) => l.weekday === wd && (l.week === "BOTH" || l.week === parity(iso)) && l.kind !== "Практика");
      if (day.length < 2) continue;
      if (i % 2 === 0) continue;
      const lesson = day[1];
      const r = reasons[picked] as { cancelled: boolean; room?: string; shift?: string[]; reason: string };
      await db.lessonChange.create({
        data: {
          lessonId: lesson.id,
          date: iso,
          cancelled: r.cancelled,
          newRoom: r.room && r.room !== lesson.room ? r.room : null,
          newStart: r.shift ? r.shift[0] : null,
          newEnd: r.shift ? r.shift[1] : null,
          reason: r.reason,
        },
      });
      picked++;
    }
  }
}

async function ensureAttendance(sid: string, aid: string) {
  const aligned = await db.attendanceRecord.findFirst({
    where: { subject: { in: ["Операционные системы", "Математический анализ"] } },
  });
  if (aligned) return;
  await db.attendanceRecord.deleteMany();
  const sofiaSubjects = [
    "Операционные системы",
    "Иностранный язык",
    "Криптографические методы защиты информации",
    "Теория информации",
    "Сети и телекоммуникации",
  ];
  const artemSubjects = ["Математический анализ", "Иностранный язык", "Основы программирования", "Физика"];
  await db.attendanceRecord.createMany({
    data: [
      ...Array.from({ length: 20 }, (_, i) => ({
        studentId: sid,
        date: `2026-11-${String(3 + (i % 17)).padStart(2, "0")}`,
        subject: sofiaSubjects[i % sofiaSubjects.length],
        status: i % 7 === 0 ? "absent" : i % 11 === 0 ? "late" : "present",
      })),
      ...Array.from({ length: 12 }, (_, i) => ({
        studentId: aid,
        date: `2026-11-${String(5 + (i % 14)).padStart(2, "0")}`,
        subject: artemSubjects[i % artemSubjects.length],
        status: i % 5 === 0 ? "absent" : "present",
      })),
    ],
  });
}

const DEMO_PASSWORDS: Record<string, string> = {
  "sofia.orlova": "Mgtimo-Sofia-2026",
  "artem.belov": "Mgtimo-Artem-2026",
  "elena.krylova": "Mgtimo-Staff-2026",
};

async function syncDemoPasswords() {
  const hash = (p: string) => bcrypt.hashSync(p, 10);
  for (const [login, password] of Object.entries(DEMO_PASSWORDS)) {
    const user = await db.user.findUnique({ where: { login } });
    if (!user) continue;
    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) {
      await db.user.update({ where: { id: user.id }, data: { passwordHash: hash(password) } });
      console.log(`updated password for ${login}`);
    }
  }
}

const g = (
  studentId: string,
  semester: number,
  subject: string,
  control: string,
  hours: number,
  score: string | null,
  extra: { examDate?: string; atRisk?: boolean; note?: string } = {},
) => ({
  studentId,
  semester,
  subject,
  control,
  hours,
  score,
  examDate: extra.examDate ?? null,
  atRisk: extra.atRisk ?? false,
  note: extra.note ?? null,
});

function sofiaGrades(sid: string) {
  return [
    // Семестр 1 — 7
    g(sid, 1, "Математический анализ", "Экзамен", 144, "5"),
    g(sid, 1, "Линейная алгебра и геометрия", "Экзамен", 108, "4"),
    g(sid, 1, "Основы программирования", "Зачёт с оценкой", 108, "5"),
    g(sid, 1, "История России", "Зачёт", 72, "Зачтено"),
    g(sid, 1, "Иностранный язык", "Зачёт", 72, "Зачтено"),
    g(sid, 1, "Введение в специальность", "Зачёт", 36, "Зачтено"),
    g(sid, 1, "Физическая культура", "Зачёт", 72, "Зачтено"),
    // Семестр 2 — 7
    g(sid, 2, "Дискретная математика", "Экзамен", 144, "4"),
    g(sid, 2, "Физика", "Экзамен", 144, "4"),
    g(sid, 2, "Алгоритмы и структуры данных", "Экзамен", 144, "5"),
    g(sid, 2, "Иностранный язык", "Зачёт", 72, "Зачтено"),
    g(sid, 2, "Экономика", "Зачёт с оценкой", 72, "4"),
    g(sid, 2, "Культурология", "Зачёт", 36, "Зачтено"),
    g(sid, 2, "Физическая культура", "Зачёт", 72, "Зачтено"),
    // Семестр 3 — 8
    g(sid, 3, "Теория вероятностей и статистика", "Экзамен", 108, "4"),
    g(sid, 3, "Электротехника и электроника", "Экзамен", 144, "3"),
    g(sid, 3, "Основы информационной безопасности", "Экзамен", 108, "5"),
    g(sid, 3, "Иностранный язык", "Зачёт", 72, "Зачтено"),
    g(sid, 3, "Базы данных", "Зачёт с оценкой", 108, "5"),
    g(sid, 3, "Философия", "Зачёт", 72, "Зачтено"),
    g(sid, 3, "Правоведение", "Зачёт", 36, "Зачтено"),
    g(sid, 3, "Физическая культура", "Зачёт", 72, "Зачтено"),
    // Семестр 4 — 7
    g(sid, 4, "Языки программирования", "Экзамен", 144, "5"),
    g(sid, 4, "Архитектура вычислительных систем", "Экзамен", 144, "4"),
    g(sid, 4, "Технологии программирования", "Зачёт с оценкой", 108, "5"),
    g(sid, 4, "Физическая культура", "Зачёт", 72, "Зачтено"),
    g(sid, 4, "Компьютерные сети", "Экзамен", 108, "4"),
    g(sid, 4, "Иностранный язык", "Зачёт", 72, "Зачтено"),
    g(sid, 4, "Политология", "Зачёт", 36, "Зачтено"),
    // Семестр 5 — 8
    g(sid, 5, "Криптографические методы защиты информации", "Экзамен", 108, null, {
      examDate: "2027-01-12",
      note: "Допуск к экзамену есть",
    }),
    g(sid, 5, "Операционные системы", "Экзамен", 144, null, {
      examDate: "2027-01-15",
      atRisk: true,
      note: "Не сдана лабораторная №5. Срок до 27 ноября, иначе допуска не будет",
    }),
    g(sid, 5, "Теория информации", "Экзамен", 108, null, { examDate: "2027-01-20" }),
    g(sid, 5, "Сети и телекоммуникации", "Зачёт", 72, "Зачтено", { note: "Зачёт поставлен автоматом" }),
    g(sid, 5, "Безопасность баз данных", "Зачёт с оценкой", 108, "4", { note: "Оценка за курсовой проект" }),
    g(sid, 5, "Иностранный язык", "Зачёт", 72, "Зачтено"),
    g(sid, 5, "Основы права в информационной безопасности", "Зачёт", 72, null, {
      examDate: "2026-12-18",
    }),
    g(sid, 5, "Проектный практикум", "Курсовая", 108, null, { examDate: "2027-01-25" }),
  ];
}

function artemGrades(aid: string) {
  return [
    g(aid, 1, "Математический анализ", "Экзамен", 144, null, { examDate: "2027-01-14" }),
    g(aid, 1, "Линейная алгебра и геометрия", "Экзамен", 108, null, { examDate: "2027-01-18" }),
    g(aid, 1, "Физика", "Экзамен", 144, null, { examDate: "2027-01-22" }),
    g(aid, 1, "Основы программирования", "Зачёт с оценкой", 108, "5", { note: "Автомат за лабораторные" }),
    g(aid, 1, "История России", "Зачёт", 72, "Зачтено"),
    g(aid, 1, "Иностранный язык", "Зачёт", 72, null, { examDate: "2026-12-21" }),
    g(aid, 1, "Введение в специальность", "Зачёт", 36, "Зачтено"),
    g(aid, 1, "Физическая культура", "Зачёт", 72, "Зачтено"),
  ];
}

async function syncDemoGrades(sofiaId: string, artemId: string) {
  await db.grade.deleteMany({ where: { studentId: { in: [sofiaId, artemId] } } });
  await db.grade.createMany({ data: [...sofiaGrades(sofiaId), ...artemGrades(artemId)] });
}

async function seedPeople() {
  const exists = await db.user.findUnique({ where: { login: "sofia.orlova" } });
  if (exists) {
    await syncDemoPasswords();
    const artem = await db.user.findUnique({ where: { login: "artem.belov" } });
    if (artem) {
      await syncDemoGrades(exists.id, artem.id);
      await ensureAttendance(exists.id, artem.id);
    }
    return;
  }

  const hash = (p: string) => bcrypt.hashSync(p, 10);

  const sofia = await db.user.create({
    data: {
      login: "sofia.orlova",
      passwordHash: hash("Mgtimo-Sofia-2026"),
      role: "STUDENT",
      fullName: "Орлова Софья Андреевна",
      student: {
        create: {
          faculty: "Международные отношения",
          direction: "Международные отношения и внешняя политика",
          course: 3,
          groupName: G_SOFIA,
          caseNumber: "23К0417",
          dorm: "Общежитие №7, комната 412",
          military: "Не подлежит воинскому учёту",
          language: "Английский",
        },
      },
    },
  });
  const artem = await db.user.create({
    data: {
      login: "artem.belov",
      passwordHash: hash("Mgtimo-Artem-2026"),
      role: "STUDENT",
      fullName: "Белов Артём Сергеевич",
      student: {
        create: {
          faculty: "Международное право",
          direction: "Международное публичное право",
          course: 1,
          groupName: G_ARTEM,
          caseNumber: "26К0233",
          dorm: "Не проживает",
          military: "Состоит на воинском учёте, отсрочка до окончания обучения",
          language: "Английский",
        },
      },
    },
  });
  const elena = await db.user.create({
    data: {
      login: "elena.krylova",
      passwordHash: hash("Mgtimo-Staff-2026"),
      role: "STAFF",
      fullName: "Крылова Елена Викторовна",
    },
  });

  await syncDemoGrades(sofia.id, artem.id);
  const sid = sofia.id;
  const aid = artem.id;

  const cl = (studentId: string, position: number, unit: string, status: string, note?: string) => ({
    studentId,
    position,
    unit,
    status,
    note: note ?? null,
  });
  await db.clearanceItem.createMany({
    data: [
      cl(sid, 1, "Библиотека", "DONE", "Задолженностей нет"),
      cl(sid, 2, "Кафедра международных отношений", "DONE", "Подпись от 14 ноября"),
      cl(sid, 3, "Кафедра иностранных языков", "WAITING", "Нужно закрыть задолженность по модулю"),
      cl(sid, 4, "Общежитие", "TODO", "Сдать ключ и подписать акт у коменданта"),
      cl(sid, 5, "Спортивная кафедра", "DONE"),
      cl(sid, 6, "Бухгалтерия", "TODO", "Подпись после закрытия задолженностей"),
      cl(sid, 7, "Деканат МГТИМО", "TODO", "Последняя подпись, ставится в конце"),
      cl(aid, 1, "Библиотека", "WAITING", "Две книги ещё числятся за вами, вернуть до 30 ноября"),
      cl(aid, 2, "Кафедра международного права", "TODO"),
      cl(aid, 3, "Деканат МГТИМО", "TODO", "Последняя подпись, ставится в конце"),
    ],
  });

  await ensureAttendance(sid, aid);

  // Заявки с историей статусов
  const mkRequest = async (
    number: string,
    studentId: string,
    type: string,
    format: string,
    comment: string,
    steps: { status: string; comment?: string; hoursAgo: number; author?: string }[],
  ) => {
    const last = steps[steps.length - 1];
    const req = await db.request.create({
      data: {
        number,
        studentId,
        type,
        format,
        comment,
        status: last.status,
        createdAt: hoursAgo(steps[0].hoursAgo),
        updatedAt: hoursAgo(last.hoursAgo),
      },
    });
    for (const s of steps) {
      await db.requestEvent.create({
        data: {
          requestId: req.id,
          status: s.status,
          comment: s.comment ?? null,
          authorId: s.author ?? null,
          createdAt: hoursAgo(s.hoursAgo),
        },
      });
    }
    return req;
  };

  const r1 = await mkRequest("2611-0041", sid, "study-cert", "Электронная", "В банк для оформления карты", [
    { status: "NEW", hoursAgo: 30 },
    { status: "IN_PROGRESS", hoursAgo: 20, comment: "Справка формируется, подпись проставят завтра", author: elena.id },
  ]);
  const r2 = await mkRequest("2610-0017", sid, "military", "Бумажная в деканате", "Для военкомата по месту прописки", [
    { status: "NEW", hoursAgo: 24 * 21 },
    { status: "IN_PROGRESS", hoursAgo: 24 * 20, author: elena.id },
    { status: "READY", hoursAgo: 24 * 17, comment: "Заберите в деканате, 2 этаж, окно 3", author: elena.id },
    { status: "ISSUED", hoursAgo: 24 * 16, author: elena.id },
  ]);
  const r3 = await mkRequest("2611-0044", aid, "dorm", "Электронная", "Заселение с 1 декабря, нужен вариант рядом с главным корпусом МГТИМО", [
    { status: "NEW", hoursAgo: 5 },
  ]);

  await db.notification.createMany({
    data: [
      { userId: sid, kind: "STATUS", title: "Заявка 2611-0041 в работе", body: "Справка об обучении формируется, подпись проставят завтра.", requestId: r1.id, readAt: null, createdAt: hoursAgo(20) },
      { userId: sid, kind: "REMINDER", title: "Лабораторная №5 по операционным системам", body: "Срок сдачи 27 ноября. Без неё не будет допуска к экзамену.", readAt: null, createdAt: hoursAgo(8) },
      { userId: sid, kind: "REMINDER", title: "Зачёт по основам права", body: "18 декабря. Конспекты и вопросы выложены у преподавателя.", readAt: hoursAgo(100), createdAt: hoursAgo(120) },
      { userId: sid, kind: "STATUS", title: "Заявка 2610-0017 выдана", body: "Справка для военкомата выдана. Заявка закрыта.", requestId: r2.id, readAt: hoursAgo(24 * 15), createdAt: hoursAgo(24 * 16) },
      { userId: aid, kind: "STATUS", title: "Заявка 2611-0044 принята", body: "Заявление на место в общежитии зарегистрировано. Ответ в течение 7 рабочих дней.", requestId: r3.id, readAt: null, createdAt: hoursAgo(5) },
      { userId: aid, kind: "REMINDER", title: "Зачёт по иностранному языку", body: "21 декабря. Подготовьте пересказ текстов за семестр.", readAt: null, createdAt: hoursAgo(30) },
    ],
  });

  const n = (faculty: string | null, title: string, body: string, ago: number) => ({ faculty, title, body, publishedAt: hoursAgo(ago) });
  await db.news.createMany({
    data: [
      n("Международные отношения", "Приём заявлений на повышенную стипендию до 30 ноября", "Подайте заявление онлайн в разделе «Заявки», достижения за семестр прикрепите к описанию.", 20),
      n(null, "Расписание зимней сессии появится 1 декабря", "Следите за уведомлениями: даты экзаменов и консультаций будут показаны на экране «Оценки и сессия».", 52),
      n("Международные отношения", "Часы приёма деканата в декабре", "Деканат МГТИМО принимает по вторникам и четвергам с 11:00 до 16:00. Срочные вопросы можно решить через заявку.", 96),
      n(null, "Справки лучше заказывать заранее", "Электронная справка делается до 3 рабочих дней, бумажная в деканате до 5. Статус виден в кабинете.", 168),
    ],
  });
}

async function main() {
  await seedLessons();
  await syncWeekendLessons();
  await seedPeople();
  await refreshChanges();
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
