import { TrainingItemMeta } from '@/types/training';

export const trainingItems: TrainingItemMeta[] = [
  {
    key: '체조',
    label: '체조',
    type: 'boolean',
  },
  {
    key: '회건술',
    label: '회건술',
    type: 'boolean',
  },
  {
    key: '석문도서봉독',
    label: '석문도서 봉독',
    type: 'boolean',
  },
  {
    key: '행공',
    label: '행공',
    type: 'number',
    placeholder: '횟수 입력',
    min: 0,
    step: 1,
  },
  {
    key: '본수련',
    label: '본수련',
    type: 'number',
    placeholder: '횟수 입력',
    min: 0,
    step: 1,
  },
  {
    key: '행공퍼센트',
    label: '행공',
    type: 'percent',
    min: 0,
    max: 100,
    step: 10,
  },
  {
    key: '운광복습',
    label: '운광복습',
    type: 'percent',
    min: 0,
    max: 100,
    step: 10,
  },
  {
    key: '삼주축광',
    label: '삼주축광',
    type: 'percent',
    min: 0,
    max: 100,
    step: 10,
  },
  {
    key: '내면공간',
    label: '내면공간',
    type: 'percent',
    min: 0,
    max: 100,
    step: 10,
  },
  {
    key: '나의역사',
    label: '나의 역사',
    type: 'boolean',
  },
  {
    key: '마음과마음가짐수련',
    label: '마음과 마음가짐 수련',
    type: 'number',
    placeholder: '횟수 입력',
    min: 0,
    step: 1,
  },
  {
    key: '회광반조',
    label: '회광반조',
    type: 'grade',
    options: [
      { value: 'A', label: 'A - 매우 우수' },
      { value: 'B', label: 'B - 우수' },
      { value: 'C', label: 'C - 보통' },
      { value: 'D', label: 'D - 미흡' },
      { value: 'E', label: 'E - 부족' },
      { value: 'F', label: 'F - 매우 부족' },
    ],
  },
  {
    key: '성찰탐구',
    label: '성찰탐구',
    type: 'grade',
    options: [
      { value: 'A', label: 'A - 매우 우수' },
      { value: 'B', label: 'B - 우수' },
      { value: 'C', label: 'C - 보통' },
      { value: 'D', label: 'D - 미흡' },
      { value: 'E', label: 'E - 부족' },
      { value: 'F', label: 'F - 매우 부족' },
    ],
  },
];

export const gradeOptions = [
  { value: 'A', label: 'A', color: 'bg-green-500' },
  { value: 'B', label: 'B', color: 'bg-blue-500' },
  { value: 'C', label: 'C', color: 'bg-yellow-500' },
  { value: 'D', label: 'D', color: 'bg-orange-500' },
  { value: 'E', label: 'E', color: 'bg-red-400' },
  { value: 'F', label: 'F', color: 'bg-red-600' },
];

export const getGradeColor = (grade: string): string => {
  const option = gradeOptions.find((o) => o.value === grade);
  return option?.color || 'bg-gray-500';
};
