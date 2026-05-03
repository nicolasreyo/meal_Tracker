export interface Macronutrients {
  p: number;
  c: number;
  f: number;
  calories: number;
}

export interface Meal {
  id: string;
  name: string;
  timestamp: string;
  macros: Macronutrients;
  image?: string;
  isCustom?: boolean;
  plannedMealId?: string;
}

export interface WaterLog {
  id: string;
  amount: number;
  timestamp: string;
}

export interface DailyStats {
  targetCalories: number;
  targetP: number;
  targetC: number;
  targetF: number;
  waterGoalMl: number;
}
