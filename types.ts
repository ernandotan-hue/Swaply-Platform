
export enum SkillCategory {
  DESIGN = 'Design',
  DEVELOPMENT = 'Development',
  MUSIC = 'Music',
  LANGUAGE = 'Language',
  BUSINESS = 'Business',
  LIFESTYLE = 'Lifestyle',
  OTHER = 'Other'
}

export enum SkillLevel {
  BEGINNER = 'Beginner',
  INTERMEDIATE = 'Intermediate',
  EXPERT = 'Expert',
  MASTER = 'Master'
}

export enum SkillStatus {
  PENDING = 'PENDING',
  VERIFIED = 'VERIFIED',
  REJECTED = 'REJECTED'
}

export interface Skill {
  id: string;
  userId: string;
  title: string;
  description: string;
  category: SkillCategory;
  image: string;
  level: SkillLevel;
  experience: number; // Years
  status: SkillStatus;
}

export interface Project {
  id: string;
  userId: string;
  title: string;
  description: string;
  requirements: string;
  fileUrl: string; // Mock URL to the project file
  category: SkillCategory;
  createdAt: Date;
}

export interface Badge {
  id: string;
  name: string;
  icon: string;
  description: string;
}

export interface User {
  id: string;
  name: string;
  email: string;
  avatar: string;
  bio: string;
  jobTitle?: string; // New field for CV/Job Title
  location: string;
  skillsOffered: Skill[];
  skillsWanted: string[];
  projects: Project[]; // New: Users can have projects
  rating: number;
  reviewCount: number;
  isOnline: boolean;
  lastSeen: Date;
  points: number;
  badges: string[]; // Badge IDs
  coins: number;
  nextFreeCoinDate: Date;
}

export enum SwapStatus {
  PENDING = 'PENDING',
  ACCEPTED = 'ACCEPTED',
  DECLINED = 'DECLINED',
  IN_REVIEW = 'IN_REVIEW', // New intermediate status for projects
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED'
}

export enum SwapType {
  SKILL = 'SKILL',
  PROJECT = 'PROJECT'
}

export interface Swap {
  id: string;
  requesterId: string;
  receiverId: string;
  
  // Type of swap
  type: SwapType; 

  // For Skill Swaps
  offeredSkillId?: string;
  requestedSkillId?: string;

  // For Project Swaps
  offeredProjectId?: string;
  requestedProjectId?: string;
  deadline?: Date; // Project swaps have deadlines

  status: SwapStatus;
  createdAt: Date;
  updatedAt: Date;
  messages: Message[];
  
  // Completion details
  completionProof?: string; // URL to image or project file
  completionNote?: string;
  
  // Review details
  rating?: number;
  reviewComment?: string;
}

export interface Message {
  id: string;
  senderId: string;
  text: string;
  timestamp: Date;
  type: 'text' | 'image' | 'system' | 'swap_request';
  status: 'sent' | 'delivered' | 'read';
  imageUrl?: string;
  swapRequestId?: string; // Links specific message to the swap negotiation details
}

export interface Notification {
  id: string;
  userId: string;
  type: 'swap_request' | 'message' | 'system';
  content: string;
  read: boolean;
  timestamp: Date;
  link?: string;
}
