// User types
export interface User {
  id: string;
  email: string;
  name: string;
  role: 'admin' | 'user' | 'guest';
  createdAt: Date;
  updatedAt: Date;
}

export interface AuthSession {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  error: string | null;
}

// Project/Shoot types
export interface Project {
  id: string;
  title: string;
  description: string;
  userId: string;
  status: 'draft' | 'planning' | 'in-progress' | 'completed' | 'archived';
  startDate: Date;
  endDate?: Date;
  tags: string[];
  createdAt: Date;
  updatedAt: Date;
}

export interface Shot {
  id: string;
  projectId: string;
  title: string;
  description: string;
  location?: string;
  plannedTime?: Date;
  status: 'planned' | 'taken' | 'approved' | 'rejected';
  notes: string;
  imageUrl?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface APIResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}
