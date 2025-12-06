import { User, Skill, Swap, SwapStatus, SkillCategory, Message, SkillLevel, SkillStatus, Project, SwapType } from '../types';
import { auth, db, storage } from './firebaseConfig';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut, onAuthStateChanged } from 'firebase/auth';
import { collection, doc, getDoc, getDocs, setDoc, addDoc, updateDoc, query, where, Timestamp, arrayUnion, orderBy } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';

// --- Helper Functions ---
const isFirebaseReady = () => {
    return auth && db && !!auth.app && !!db.app;
};

const convertTimestamps = (data: any): any => {
    if (!data) return data;
    if (typeof data === 'object') {
        if (data.toDate && typeof data.toDate === 'function') {
            return data.toDate();
        }
        // Handle arrays
        if (Array.isArray(data)) {
            return data.map(item => convertTimestamps(item));
        }
        // Handle nested objects
        const newData: any = {};
        for (const key in data) {
            newData[key] = convertTimestamps(data[key]);
        }
        return newData;
    }
    return data;
};

// --- Mock Data Fallback ---
let MOCK_USERS: User[] = [
    {
        id: 'user_1',
        name: 'John Doe',
        email: 'john@example.com',
        avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=John',
        bio: 'Full Stack Developer',
        location: 'New York',
        skillsOffered: [],
        skillsWanted: [],
        projects: [],
        rating: 4.8,
        reviewCount: 12,
        isOnline: true,
        lastSeen: new Date(),
        points: 150,
        badges: ['Early Adopter'],
        coins: 5,
        nextFreeCoinDate: new Date()
    },
    {
        id: 'user_2',
        name: 'Jane Smith',
        email: 'jane@example.com',
        avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Jane',
        bio: 'Graphic Designer',
        location: 'London',
        skillsOffered: [],
        skillsWanted: [],
        projects: [],
        rating: 5.0,
        reviewCount: 8,
        isOnline: false,
        lastSeen: new Date(),
        points: 200,
        badges: [],
        coins: 10,
        nextFreeCoinDate: new Date()
    }
];

let MOCK_SKILLS: Skill[] = [
    {
        id: 'skill_1',
        userId: 'user_1',
        title: 'React Development',
        description: 'I can teach you React and TypeScript.',
        category: SkillCategory.DEVELOPMENT,
        image: 'https://picsum.photos/400/300',
        level: SkillLevel.EXPERT,
        experience: 5,
        status: SkillStatus.VERIFIED
    },
    {
        id: 'skill_2',
        userId: 'user_2',
        title: 'Logo Design',
        description: 'Professional logo design services.',
        category: SkillCategory.DESIGN,
        image: 'https://picsum.photos/401/300',
        level: SkillLevel.INTERMEDIATE,
        experience: 3,
        status: SkillStatus.VERIFIED
    }
];

let MOCK_PROJECTS: Project[] = [];
let MOCK_SWAPS: Swap[] = [];

class StoreService {
  private currentUser: User | null = null;
  private listeners: Function[] = [];

  constructor() {
     if (isFirebaseReady()) {
         onAuthStateChanged(auth, async (firebaseUser) => {
             if (firebaseUser) {
                 try {
                     const docRef = doc(db, 'users', firebaseUser.uid);
                     const docSnap = await getDoc(docRef);
                     if (docSnap.exists()) {
                         this.currentUser = { id: docSnap.id, ...convertTimestamps(docSnap.data()) } as User;
                     } else {
                         console.warn("User authenticated but no profile found in Firestore.");
                     }
                 } catch (e) {
                     console.error("Error fetching user profile from Firestore:", e);
                 }
             } else {
                 this.currentUser = null;
             }
             this.notifyListeners();
         });
     } else {
         // Fallback to local storage for mock mode
         try {
            const storedUid = localStorage.getItem('swaply_uid');
            if (storedUid) {
                this.currentUser = MOCK_USERS.find(u => u.id === storedUid) || null;
            }
         } catch (e) {
             console.warn("LocalStorage not available");
         }
     }
  }

  subscribe(listener: Function) {
      this.listeners.push(listener);
      listener(this.currentUser);
      return () => {
          this.listeners = this.listeners.filter(l => l !== listener);
      };
  }

  private notifyListeners() {
      this.listeners.forEach(l => l(this.currentUser));
  }

  getCurrentUser(): User | null {
      return this.currentUser;
  }

  async uploadFile(file: File, path: string): Promise<string> {
      if (isFirebaseReady() && storage) {
          try {
              const storageRef = ref(storage, path);
              await uploadBytes(storageRef, file);
              const url = await getDownloadURL(storageRef);
              return url;
          } catch (e: any) {
              console.error("Upload failed:", e);
              // Fallback for when Storage is not enabled or rules fail
              console.warn("⚠️ Using local URL fallback. Enable Firebase Storage for cross-device images.");
              return URL.createObjectURL(file);
          }
      } else {
          // Mock mode fallback
          return URL.createObjectURL(file);
      }
  }

  async login(email: string, password: string): Promise<{ success: boolean, user?: User, message?: string }> {
      if (isFirebaseReady()) {
          try {
              const cred = await signInWithEmailAndPassword(auth, email, password);
              const docRef = doc(db, 'users', cred.user.uid);
              const docSnap = await getDoc(docRef);
              if (docSnap.exists()) {
                  this.currentUser = { id: docSnap.id, ...convertTimestamps(docSnap.data()) } as User;
                  this.notifyListeners();
                  return { success: true, user: this.currentUser };
              } else {
                  return { success: false, message: 'User profile not found in database.' };
              }
          } catch (e: any) {
              console.error("Firebase Login Error:", e);
              return { success: false, message: e.message };
          }
      } else {
          // Mock Login
          await new Promise(resolve => setTimeout(resolve, 500));
          const user = MOCK_USERS.find(u => u.email === email);
          if (user) {
              this.currentUser = user;
              localStorage.setItem('swaply_uid', user.id);
              this.notifyListeners();
              return { success: true, user };
          }
          return { success: false, message: 'Invalid credentials (Mock Mode).' };
      }
  }

  async register(data: { name: string; email: string; bio: string; location: string }): Promise<User> {
       return this.registerWithPassword(data, 'password123');
  }
  
  async registerWithPassword(data: { name: string; email: string; bio: string; location: string }, password?: string): Promise<User> {
      if (isFirebaseReady() && password) {
          try {
              const cred = await createUserWithEmailAndPassword(auth, data.email, password);
              const newUser: User = {
                   id: cred.user.uid,
                   name: data.name,
                   email: data.email,
                   avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${data.name}`,
                   bio: data.bio,
                   location: data.location,
                   skillsOffered: [],
                   skillsWanted: [],
                   projects: [],
                   rating: 0,
                   reviewCount: 0,
                   isOnline: true,
                   lastSeen: new Date(),
                   points: 50,
                   badges: [],
                   coins: 3,
                   nextFreeCoinDate: new Date()
               };
               
               await setDoc(doc(db, 'users', cred.user.uid), newUser);
               
               this.currentUser = newUser;
               this.notifyListeners();
               return newUser;
          } catch (e: any) {
              console.error("Registration Error (Firebase):", e);
              throw new Error(`Registration failed: ${e.message}. Check Firestore Rules.`);
          }
      } else {
          await new Promise(resolve => setTimeout(resolve, 500));
          const newUser: User = {
               id: `user_${Date.now()}`,
               name: data.name,
               email: data.email,
               avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${data.name}`,
               bio: data.bio,
               location: data.location,
               skillsOffered: [],
               skillsWanted: [],
               projects: [],
               rating: 0,
               reviewCount: 0,
               isOnline: true,
               lastSeen: new Date(),
               points: 0,
               badges: [],
               coins: 1,
               nextFreeCoinDate: new Date()
          };
          MOCK_USERS.push(newUser);
          this.currentUser = newUser;
          localStorage.setItem('swaply_uid', newUser.id);
          this.notifyListeners();
          return newUser;
      }
  }

  async logout() {
      if (isFirebaseReady()) {
          await signOut(auth);
      } else {
          this.currentUser = null;
          localStorage.removeItem('swaply_uid');
      }
      this.notifyListeners();
  }

  async getUserById(id: string): Promise<User | undefined> {
      if (isFirebaseReady()) {
          try {
              const snap = await getDoc(doc(db, 'users', id));
              if (snap.exists()) return { id: snap.id, ...convertTimestamps(snap.data()) } as User;
          } catch (e) { console.error(e); }
          return undefined;
      }
      return MOCK_USERS.find(u => u.id === id);
  }

  async updateUser(userId: string, updates: Partial<User>) {
      if (isFirebaseReady()) {
          await updateDoc(doc(db, 'users', userId), updates);
          if (this.currentUser?.id === userId) {
              this.currentUser = { ...this.currentUser, ...updates };
              this.notifyListeners();
          }
      } else {
          const idx = MOCK_USERS.findIndex(u => u.id === userId);
          if (idx !== -1) {
              MOCK_USERS[idx] = { ...MOCK_USERS[idx], ...updates };
              if (this.currentUser?.id === userId) {
                  this.currentUser = MOCK_USERS[idx];
                  this.notifyListeners();
              }
          }
      }
  }
  
  async addCoins(amount: number) {
      if (this.currentUser) {
          await this.updateUser(this.currentUser.id, { coins: (this.currentUser.coins || 0) + amount });
      }
  }

  // --- SKILLS ---

  async getSkills(): Promise<Skill[]> {
      if (isFirebaseReady()) {
          const q = query(collection(db, 'skills'), where('status', '==', SkillStatus.VERIFIED));
          const snap = await getDocs(q);
          return snap.docs.map(d => ({ id: d.id, ...convertTimestamps(d.data()) } as Skill));
      }
      return MOCK_SKILLS.filter(s => s.status === SkillStatus.VERIFIED);
  }

  async getUserSkills(userId: string): Promise<Skill[]> {
      if (isFirebaseReady()) {
          const q = query(collection(db, 'skills'), where('userId', '==', userId));
          const snap = await getDocs(q);
          return snap.docs.map(d => ({ id: d.id, ...convertTimestamps(d.data()) } as Skill));
      }
      return MOCK_SKILLS.filter(s => s.userId === userId);
  }
  
  async getSkillById(id: string): Promise<Skill | undefined> {
      if (isFirebaseReady()) {
          const snap = await getDoc(doc(db, 'skills', id));
          if (snap.exists()) return { id: snap.id, ...convertTimestamps(snap.data()) } as Skill;
          return undefined;
      }
      return MOCK_SKILLS.find(s => s.id === id);
  }

  async addSkill(userId: string, skillData: Partial<Skill>): Promise<Skill> {
      const newSkill: any = {
          userId,
          title: skillData.title || 'Untitled',
          description: skillData.description || '',
          category: skillData.category || SkillCategory.OTHER,
          image: skillData.image || 'https://picsum.photos/400/300',
          level: skillData.level || SkillLevel.BEGINNER,
          experience: skillData.experience || 0,
          status: SkillStatus.PENDING, 
          createdAt: new Date()
      };

      if (isFirebaseReady()) {
          const docRef = await addDoc(collection(db, 'skills'), newSkill);
          console.log("Skill added with ID:", docRef.id);
          return { id: docRef.id, ...newSkill } as Skill;
      } else {
          const s = { ...newSkill, id: `skill_${Date.now()}` } as Skill;
          MOCK_SKILLS.push(s);
          return s;
      }
  }

  async verifySkill(skillId: string) {
      if (isFirebaseReady()) {
          await updateDoc(doc(db, 'skills', skillId), { status: SkillStatus.VERIFIED });
      } else {
          const s = MOCK_SKILLS.find(sk => sk.id === skillId);
          if (s) s.status = SkillStatus.VERIFIED;
      }
  }

  // --- PROJECTS ---

  async getProjects(): Promise<Project[]> {
      if (isFirebaseReady()) {
           const snap = await getDocs(collection(db, 'projects'));
           return snap.docs.map(d => ({ id: d.id, ...convertTimestamps(d.data()) } as Project));
      }
      return MOCK_PROJECTS;
  }

  async getProjectById(id: string): Promise<Project | undefined> {
      if (isFirebaseReady()) {
          const snap = await getDoc(doc(db, 'projects', id));
          if (snap.exists()) return { id: snap.id, ...convertTimestamps(snap.data()) } as Project;
          return undefined;
      }
      return MOCK_PROJECTS.find(p => p.id === id);
  }

  async addProject(userId: string, projectData: Partial<Project>): Promise<Project> {
      const newProject: any = {
          userId,
          title: projectData.title || 'Untitled',
          description: projectData.description || '',
          requirements: projectData.requirements || '',
          fileUrl: projectData.fileUrl || '#',
          category: projectData.category || SkillCategory.OTHER,
          createdAt: new Date()
      };

      if (isFirebaseReady()) {
          const docRef = await addDoc(collection(db, 'projects'), newProject);
          return { id: docRef.id, ...newProject } as Project;
      } else {
          const p = { ...newProject, id: `proj_${Date.now()}` } as Project;
          MOCK_PROJECTS.push(p);
          return p;
      }
  }

  // --- SWAPS ---

  async getSwapsForUser(userId: string): Promise<Swap[]> {
      if (isFirebaseReady()) {
          const q1 = query(collection(db, 'swaps'), where('requesterId', '==', userId));
          const q2 = query(collection(db, 'swaps'), where('receiverId', '==', userId));
          
          const [snap1, snap2] = await Promise.all([getDocs(q1), getDocs(q2)]);
          const swaps = new Map();
          snap1.forEach(d => swaps.set(d.id, { id: d.id, ...convertTimestamps(d.data()) }));
          snap2.forEach(d => swaps.set(d.id, { id: d.id, ...convertTimestamps(d.data()) }));
          
          return Array.from(swaps.values()) as Swap[];
      }
      return MOCK_SWAPS.filter(s => s.requesterId === userId || s.receiverId === userId);
  }

  async createSwapRequest(requesterId: string, receiverId: string, requestedId: string, offeredId: string, isProject: boolean = false, deadline?: Date): Promise<Swap | null> {
      const user = this.getCurrentUser();
      if (!user || user.coins < 1) return null;

      await this.addCoins(-1);

      const newSwap: any = {
          requesterId,
          receiverId,
          type: isProject ? SwapType.PROJECT : SwapType.SKILL,
          status: SwapStatus.PENDING,
          createdAt: new Date(),
          updatedAt: new Date(),
          messages: [],
          ...(isProject ? { offeredProjectId: offeredId, requestedProjectId: requestedId, deadline } : { offeredSkillId: offeredId, requestedSkillId: requestedId })
      };
      
      const msg: Message = {
          id: `msg_${Date.now()}`,
          senderId: requesterId,
          text: `LOG: New Request Sent`,
          timestamp: new Date(),
          type: 'swap_request',
          status: 'sent',
          swapRequestId: 'temp' 
      };
      newSwap.messages.push(msg);

      if (isFirebaseReady()) {
          const docRef = await addDoc(collection(db, 'swaps'), newSwap);
          return { id: docRef.id, ...newSwap } as Swap;
      } else {
          const s = { ...newSwap, id: `swap_${Date.now()}` } as Swap;
          s.messages[0].swapRequestId = s.id;
          MOCK_SWAPS.push(s);
          return s;
      }
  }

  async createProjectSwapRequest(reqId: string, recId: string, reqPId: string, offPId: string, dl: Date) {
      return this.createSwapRequest(reqId, recId, reqPId, offPId, true, dl);
  }

  async sendMessage(swapId: string, senderId: string, text: string, imageUrl?: string): Promise<Message> {
      const newMessage: Message = {
          id: `msg_${Date.now()}_${Math.random()}`,
          senderId,
          text,
          type: senderId === 'system' ? 'system' : (imageUrl ? 'image' : 'text'),
          imageUrl,
          timestamp: new Date(),
          status: 'sent'
      };
      
      if (isFirebaseReady()) {
          const swapRef = doc(db, 'swaps', swapId);
          await updateDoc(swapRef, {
              messages: arrayUnion(newMessage),
              updatedAt: new Date()
          });
      } else {
          const swap = MOCK_SWAPS.find(s => s.id === swapId);
          if (!swap) throw new Error("Swap not found");
          swap.messages.push(newMessage);
          swap.updatedAt = new Date();
      }
      return newMessage;
  }

  async acceptSwap(swapId: string): Promise<{ success: boolean, message: string }> {
      if (isFirebaseReady()) {
          await updateDoc(doc(db, 'swaps', swapId), {
              status: SwapStatus.ACCEPTED,
              updatedAt: new Date()
          });
          await this.sendMessage(swapId, 'system', 'Swap Accepted! Locked until completion.');
          return { success: true, message: 'Accepted' };
      } else {
          const swap = MOCK_SWAPS.find(s => s.id === swapId);
          if (swap) {
              swap.status = SwapStatus.ACCEPTED;
              swap.updatedAt = new Date();
              await this.sendMessage(swapId, 'system', 'Swap Accepted! Locked until completion.');
              return { success: true, message: 'Accepted' };
          }
      }
      return { success: false, message: 'Failed' };
  }

  async declineSwap(swapId: string) {
      if (isFirebaseReady()) {
          await updateDoc(doc(db, 'swaps', swapId), {
              status: SwapStatus.DECLINED,
              updatedAt: new Date()
          });
          await this.sendMessage(swapId, 'system', 'Swap Request Declined.');
      } else {
          const swap = MOCK_SWAPS.find(s => s.id === swapId);
          if (swap) {
              swap.status = SwapStatus.DECLINED;
              swap.updatedAt = new Date();
              await this.sendMessage(swapId, 'system', 'Swap Request Declined.');
          }
      }
  }

  async completeSwap(swapId: string, proofUrl: string, note: string) {
      if (isFirebaseReady()) {
           const swapSnap = await getDoc(doc(db, 'swaps', swapId));
           if (!swapSnap.exists()) return;
           const swap = swapSnap.data() as Swap;

           const updates: any = {
               completionProof: proofUrl,
               completionNote: note,
               updatedAt: new Date()
           };

           if (swap.type === SwapType.PROJECT) {
                updates.status = SwapStatus.IN_REVIEW;
                await updateDoc(doc(db, 'swaps', swapId), updates);
                await this.sendMessage(swapId, 'system', 'Project file submitted! Waiting for review.');
           } else {
                updates.status = SwapStatus.COMPLETED;
                await updateDoc(doc(db, 'swaps', swapId), updates);
                await this.sendMessage(swapId, 'system', 'Swap Completed! +100 Points.');
                await this.awardPoints(swap.requesterId, 100);
                await this.awardPoints(swap.receiverId, 100);
           }
      } else {
          const swap = MOCK_SWAPS.find(s => s.id === swapId);
          if (!swap) return;

          swap.completionProof = proofUrl;
          swap.completionNote = note;
          swap.updatedAt = new Date();

          if (swap.type === SwapType.PROJECT) {
              swap.status = SwapStatus.IN_REVIEW;
              await this.sendMessage(swapId, 'system', 'Project file submitted! Waiting for review.');
          } else {
              swap.status = SwapStatus.COMPLETED;
              await this.sendMessage(swapId, 'system', 'Swap Completed! +100 Points.');
              await this.awardPoints(swap.requesterId, 100);
              await this.awardPoints(swap.receiverId, 100);
          }
      }
  }

  async submitReview(swapId: string, rating: number, comment: string) {
      if (isFirebaseReady()) {
           const swapSnap = await getDoc(doc(db, 'swaps', swapId));
           if (!swapSnap.exists()) return;
           const swap = swapSnap.data() as Swap;
          
           await updateDoc(doc(db, 'swaps', swapId), {
               rating,
               reviewComment: comment,
               status: SwapStatus.COMPLETED,
               updatedAt: new Date()
           });

           await this.sendMessage(swapId, 'system', `Project Rated ${rating}/5 Stars.`);
           await this.awardPoints(swap.requesterId, 100);
           await this.awardPoints(swap.receiverId, 100);
      } else {
          const swap = MOCK_SWAPS.find(s => s.id === swapId);
          if (!swap) return;
          
          swap.rating = rating;
          swap.reviewComment = comment;
          swap.status = SwapStatus.COMPLETED;
          swap.updatedAt = new Date();

          await this.sendMessage(swapId, 'system', `Project Rated ${rating}/5 Stars.`);
          await this.awardPoints(swap.requesterId, 100);
          await this.awardPoints(swap.receiverId, 100);
      }
  }

  private async awardPoints(userId: string, amount: number) {
      const user = await this.getUserById(userId);
      if (user) {
          await this.updateUser(userId, { points: (user.points || 0) + amount });
      }
  }
}

export const store = new StoreService();