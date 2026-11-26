import { WorkoutDay } from '@/types/fitlife';
import { generateUuid } from '@/lib/nutrition';

export const THAI_WEEKDAYS = [
  'วันจันทร์',
  'วันอังคาร',
  'วันพุธ',
  'วันพฤหัสบดี',
  'วันศุกร์',
  'วันเสาร์',
  'วันอาทิตย์',
] as const;

export const DEFAULT_WORKOUTS: WorkoutDay[] = [
  {
    dayName: 'วันจันทร์',
    focus: 'โปรแกรมเต็มตัว A • อก หลัง ขา',
    completedAt: null,
    exercises: [
      {
        id: 'w1_1',
        name: 'สควอท (Squat / Goblet Squat)',
        weight: 20,
        reps: 12,
        sets: [false, false, false, false],
        tip: 'ยืดอก หลังตรง ทิ้งสะโพกไปด้านหลัง เข่าไม่งุ้มเข้าใน',
      },
      {
        id: 'w1_2',
        name: 'ดันอก (Dumbbell Chest Press / วิดพื้น)',
        weight: 15,
        reps: 10,
        sets: [false, false, false, false],
        tip: 'กดไหล่ลง หายใจเข้าตอนลดน้ำหนัก ดันขึ้นพร้อมหายใจออก',
      },
      {
        id: 'w1_3',
        name: 'ดึงหลัง (Lat Pulldown / Dumbbell Row)',
        weight: 35,
        reps: 12,
        sets: [false, false, false, false],
        tip: 'ดึงด้วยศอกและสะบัก ไม่ใช้แรงเหวี่ยงจากหลังล่าง',
      },
      {
        id: 'w1_4',
        name: 'ดันไหล่ (Dumbbell Shoulder Press)',
        weight: 10,
        reps: 12,
        sets: [false, false, false, false],
        tip: 'เกร็งแกนกลางลำตัว ไม่แอ่นหลังขณะดันขึ้นเหนือศีรษะ',
      },
      {
        id: 'w1_5',
        name: 'แพลงก์ค้าง (Plank • วินาที)',
        weight: 0,
        reps: 45,
        sets: [false, false, false, false],
        tip: 'เกร็งหน้าท้องและก้นให้ลำตัวเป็นเส้นตรง ไม่ปล่อยเอวตก',
      },
    ],
  },
  {
    dayName: 'วันพุธ',
    focus: 'โปรแกรมเต็มตัว B • สะโพก หลังบน ไหล่',
    completedAt: null,
    exercises: [
      {
        id: 'w2_1',
        name: 'โรมาเนียน เดดลิฟต์ (Romanian Deadlift)',
        weight: 25,
        reps: 10,
        sets: [false, false, false, false],
        tip: 'พับสะโพกไปด้านหลัง หลังตรง รู้สึกตึงกล้ามเนื้อต้นขาด้านหลัง',
      },
      {
        id: 'w2_2',
        name: 'ดันอกเอียง (Incline Dumbbell Press)',
        weight: 12.5,
        reps: 12,
        sets: [false, false, false, false],
        tip: 'ปรับม้านั่งเอียงประมาณ 30 องศา เน้นกล้ามเนื้อหน้าอกส่วนบน',
      },
      {
        id: 'w2_3',
        name: 'พายเรือดึงหลัง (Seated Cable / Bent-over Row)',
        weight: 35,
        reps: 12,
        sets: [false, false, false, false],
        tip: 'บีบสะบักเข้าหากันค้างไว้ 1 วินาทีก่อนปล่อยกลับช้าๆ',
      },
      {
        id: 'w2_4',
        name: 'ยกแขนด้านข้าง (Lateral Raise)',
        weight: 5,
        reps: 15,
        sets: [false, false, false, false],
        tip: 'ยกศอกนำขึ้นระดับไหล่ คุมจังหวะลงช้าๆ ไม่ยักคอขึ้นตาม',
      },
      {
        id: 'w2_5',
        name: 'ลันจ์สลับขา (Reverse / Walking Lunge)',
        weight: 10,
        reps: 12,
        sets: [false, false, false, false],
        tip: 'ก้าวขาให้เข่าทำมุม ~90 องศา รักษาสมดุลลำตัวตั้งตรง',
      },
    ],
  },
  {
    dayName: 'วันศุกร์',
    focus: 'โปรแกรมเต็มตัว C • ขา แขน แกนกลาง',
    completedAt: null,
    exercises: [
      {
        id: 'w3_1',
        name: 'เลกเพรส / สปลิทสควอท (Leg Press / Split Squat)',
        weight: 50,
        reps: 12,
        sets: [false, false, false, false],
        tip: 'วางเท้าเต็มแผ่น กดน้ำหนักด้วยส้นเท้า ไม่ล็อกเข่าตอนเหยียดสุด',
      },
      {
        id: 'w3_2',
        name: 'วิดพื้น / ฟลายหน้าอก (Push-up / Chest Fly)',
        weight: 0,
        reps: 15,
        sets: [false, false, false, false],
        tip: 'ควบคุมจังหวะลงช้าๆ 2 วินาที แล้วออกแรงดันขึ้นเต็มช่วง',
      },
      {
        id: 'w3_3',
        name: 'ดึงข้อช่วย / ดึงบาร์หน้าอก (Lat Pulldown)',
        weight: 35,
        reps: 10,
        sets: [false, false, false, false],
        tip: 'เปิดอก ดึงบาร์ลงมาถึงระดับไหปลาร้า เน้นยืดและหดหลังให้เต็มที่',
      },
      {
        id: 'w3_4',
        name: 'หน้าแขน & หลังแขน (Curl + Pushdown)',
        weight: 10,
        reps: 12,
        sets: [false, false, false, false],
        tip: 'ล็อกศอกแนบลำตัว พับแขนขึ้นลงแบบคุมจังหวะไม่ใช้แรงเหวี่ยง',
      },
      {
        id: 'w3_5',
        name: 'ยกขาบริหารหน้าท้อง (Leg Raise / Crunch)',
        weight: 0,
        reps: 15,
        sets: [false, false, false, false],
        tip: 'เกร็งหน้าท้องม้วนสะโพกขึ้น ไม่กระชากคอหรือกลั้นหายใจ',
      },
    ],
  },
];

export function cloneDefaultWorkouts(): WorkoutDay[] {
  return JSON.parse(JSON.stringify(DEFAULT_WORKOUTS)) as WorkoutDay[];
}

export function createWorkoutDayFromTemplate(
  dayName: string,
  focus?: string,
  templateType: 'fullbodyA' | 'fullbodyB' | 'fullbodyC' | 'empty' = 'fullbodyA'
): WorkoutDay {
  if (templateType === 'empty') {
    return {
      dayName,
      focus: focus?.trim() || 'โปรแกรมส่วนตัว',
      completedAt: null,
      exercises: [],
    };
  }
  const idx = templateType === 'fullbodyB' ? 1 : templateType === 'fullbodyC' ? 2 : 0;
  const tpl = DEFAULT_WORKOUTS[idx];
  return {
    dayName,
    focus: focus?.trim() || tpl.focus,
    completedAt: null,
    exercises: tpl.exercises.map((ex) => ({
      ...ex,
      id: generateUuid(),
      sets: ex.sets.map(() => false),
    })),
  };
}
