import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { db } from '../config/firebase';
import { displayCPF, formatCPF, validateCPF } from '../utils/cpfUtils';
import { validatePassword } from '../utils/passwordUtils';
import {
  collection,
  query,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  Timestamp,
} from 'firebase/firestore';

interface TimeSlot {
  id?: string;
  teacherId: string;
  day: string;
  time: string;
  subject: string;
  room: string;
}

interface Subject {
  id?: string;
  name: string;
  code?: string;
  createdAt: Timestamp;
}

interface Room {
  id?: string;
  name: string;
  code?: string;
  createdAt: Timestamp;
}

interface Teacher {
  userId: string;
  cpf: string;
  name?: string;
  profile?: string;
}

const DAYS = ['Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira', 'Sábado'];
const TIME_SLOTS = [
  '08:00-09:00',
  '09:00-10:00',
  '10:00-11:00',
  '11:00-12:00',
  '12:00-13:00',
  '13:00-14:00',
  '14:00-15:00',
  '15:00-16:00',
  '16:00-17:00',
];

export default function CoordinatorDashboard() {
  const { logout, userName, userCPF, updateProfile } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const [activeTab, setActiveTab] = useState<'subjects' | 'rooms' | 'timetables'>('subjects');
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [allTimeSlots, setAllTimeSlots] = useState<TimeSlot[]>([]);
  const [selectedTeacher, setSelectedTeacher] = useState<string | 'all'>('all');
  const [loading, setLoading] = useState(true);
  const [showAddSubjectModal, setShowAddSubjectModal] = useState(false);
  const [editingSubjectId, setEditingSubjectId] = useState<string | null>(null);
  const [newSubjectName, setNewSubjectName] = useState('');
  const [newSubjectCode, setNewSubjectCode] = useState('');
  const [showAddRoomModal, setShowAddRoomModal] = useState(false);
  const [editingRoomId, setEditingRoomId] = useState<string | null>(null);
  const [newRoomName, setNewRoomName] = useState('');
  const [newRoomCode, setNewRoomCode] = useState('');
  const [showEditSlotModal, setShowEditSlotModal] = useState(false);
  const [editingSlot, setEditingSlot] = useState<TimeSlot | null>(null);
  const [slotFormData, setSlotFormData] = useState({ subject: '', room: '' });
  const [showAddSlotModal, setShowAddSlotModal] = useState(false);
  const [selectedDay, setSelectedDay] = useState<string>('');
  const [selectedTime, setSelectedTime] = useState<string>('');
  const [newSlotFormData, setNewSlotFormData] = useState({ teacherId: '', subject: '', room: '' });
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [profileData, setProfileData] = useState({ name: '', cpf: '', password: '', currentPassword: '' });
  const [profileError, setProfileError] = useState('');
  const [profileSuccess, setProfileSuccess] = useState('');
  const [profileLoading, setProfileLoading] = useState(false);
  const [cpfError, setCpfError] = useState('');
  const [passwordError, setPasswordError] = useState('');

  useEffect(() => {
    loadSubjects();
    loadRooms();
    loadTeachers();
    loadAllTimeSlots();
  }, []);

  useEffect(() => {
    if (activeTab === 'timetables') {
      loadAllTimeSlots();
      loadSubjects();
      loadRooms();
    }
  }, [activeTab, selectedTeacher]);

  const loadSubjects = async () => {
    try {
      const q = query(collection(db, 'subjects'));
      const querySnapshot = await getDocs(q);
      const subjectsList: Subject[] = [];
      querySnapshot.forEach((doc) => {
        subjectsList.push({ id: doc.id, ...doc.data() } as Subject);
      });
      setSubjects(subjectsList.sort((a, b) => a.name.localeCompare(b.name)));
    } catch (error) {
      console.error('Error loading subjects:', error);
    }
  };

  const loadRooms = async () => {
    try {
      const q = query(collection(db, 'rooms'));
      const querySnapshot = await getDocs(q);
      const roomsList: Room[] = [];
      querySnapshot.forEach((doc) => {
        roomsList.push({ id: doc.id, ...doc.data() } as Room);
      });
      setRooms(roomsList.sort((a, b) => a.name.localeCompare(b.name)));
    } catch (error) {
      console.error('Error loading rooms:', error);
    }
  };

  const loadTeachers = async () => {
    try {
      const q = query(collection(db, 'users'));
      const querySnapshot = await getDocs(q);
      const teachersList: Teacher[] = [];
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        teachersList.push({
          userId: doc.id,
          cpf: data.cpf || '',
          name: data.name || '',
          profile: data.profile || 'regular',
        });
      });
      setTeachers(teachersList);
    } catch (error) {
      console.error('Error loading teachers:', error);
    }
  };

  const loadAllTimeSlots = async () => {
    try {
      setLoading(true);
      const q = query(collection(db, 'timetable'));
      const querySnapshot = await getDocs(q);
      const slots: TimeSlot[] = [];
      querySnapshot.forEach((doc) => {
        slots.push({ id: doc.id, ...doc.data() } as TimeSlot);
      });
      setAllTimeSlots(slots);
    } catch (error) {
      console.error('Error loading timetables:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddSubject = async () => {
    if (!newSubjectName.trim()) {
      return;
    }

    try {
      await addDoc(collection(db, 'subjects'), {
        name: newSubjectName.trim(),
        code: newSubjectCode.trim() || null,
        createdAt: Timestamp.now(),
      });
      await loadSubjects();
      setShowAddSubjectModal(false);
      setEditingSubjectId(null);
      setNewSubjectName('');
      setNewSubjectCode('');
    } catch (error) {
      console.error('Error adding subject:', error);
      alert('Erro ao adicionar disciplina. Tente novamente.');
    }
  };

  const handleUpdateSubject = async () => {
    if (!editingSubjectId || !newSubjectName.trim()) {
      return;
    }

    try {
      const subjectRef = doc(db, 'subjects', editingSubjectId);
      await updateDoc(subjectRef, {
        name: newSubjectName.trim(),
        code: newSubjectCode.trim() || null,
      });
      await loadSubjects();
      setShowAddSubjectModal(false);
      setEditingSubjectId(null);
      setNewSubjectName('');
      setNewSubjectCode('');
    } catch (error) {
      console.error('Error updating subject:', error);
      alert('Erro ao atualizar disciplina. Tente novamente.');
    }
  };

  const handleEditSubject = (subject: Subject) => {
    setEditingSubjectId(subject.id || null);
    setNewSubjectName(subject.name);
    setNewSubjectCode(subject.code || '');
    setShowAddSubjectModal(true);
  };

  const handleDeleteSubject = async (subjectId: string) => {
    if (!window.confirm('Tem certeza que deseja excluir esta disciplina?')) {
      return;
    }

    try {
      await deleteDoc(doc(db, 'subjects', subjectId));
      await loadSubjects();
    } catch (error) {
      console.error('Error deleting subject:', error);
      alert('Erro ao excluir disciplina. Tente novamente.');
    }
  };

  const handleAddRoom = async () => {
    if (!newRoomName.trim()) {
      return;
    }

    try {
      await addDoc(collection(db, 'rooms'), {
        name: newRoomName.trim(),
        code: newRoomCode.trim() || null,
        createdAt: Timestamp.now(),
      });
      await loadRooms();
      setShowAddRoomModal(false);
      setEditingRoomId(null);
      setNewRoomName('');
      setNewRoomCode('');
    } catch (error) {
      console.error('Error adding room:', error);
      alert('Erro ao adicionar sala. Tente novamente.');
    }
  };

  const handleUpdateRoom = async () => {
    if (!editingRoomId || !newRoomName.trim()) {
      return;
    }

    try {
      const roomRef = doc(db, 'rooms', editingRoomId);
      await updateDoc(roomRef, {
        name: newRoomName.trim(),
        code: newRoomCode.trim() || null,
      });
      await loadRooms();
      setShowAddRoomModal(false);
      setEditingRoomId(null);
      setNewRoomName('');
      setNewRoomCode('');
    } catch (error) {
      console.error('Error updating room:', error);
      alert('Erro ao atualizar sala. Tente novamente.');
    }
  };

  const handleEditRoom = (room: Room) => {
    setEditingRoomId(room.id || null);
    setNewRoomName(room.name);
    setNewRoomCode(room.code || '');
    setShowAddRoomModal(true);
  };

  const handleSlotClick = (slot: TimeSlot) => {
    setEditingSlot(slot);
    setSlotFormData({
      subject: slot.subject,
      room: slot.room,
    });
    setShowEditSlotModal(true);
  };

  const handleUpdateSlot = async () => {
    if (!editingSlot || !slotFormData.subject || !slotFormData.room) {
      alert('Por favor, preencha todos os campos obrigatórios.');
      return;
    }

    // Ensure subject is from the registered list
    const isValidSubject = subjects.some(subject => subject.name === slotFormData.subject);
    if (!isValidSubject) {
      alert('Por favor, selecione uma disciplina válida da lista.');
      return;
    }

    // Ensure room is from the registered list
    const isValidRoom = rooms.some(room => room.name === slotFormData.room);
    if (!isValidRoom) {
      alert('Por favor, selecione uma sala válida da lista.');
      return;
    }

    try {
      const slotRef = doc(db, 'timetable', editingSlot.id!);
      await updateDoc(slotRef, {
        subject: slotFormData.subject,
        room: slotFormData.room,
      });
      await loadAllTimeSlots();
      setShowEditSlotModal(false);
      setEditingSlot(null);
      setSlotFormData({ subject: '', room: '' });
    } catch (error) {
      console.error('Error updating slot:', error);
      alert('Erro ao atualizar horário. Tente novamente.');
    }
  };

  const handleDeleteSlot = async (slotId: string) => {
    if (!window.confirm('Tem certeza que deseja excluir este horário?')) {
      return;
    }

    try {
      await deleteDoc(doc(db, 'timetable', slotId));
      await loadAllTimeSlots();
    } catch (error) {
      console.error('Error deleting slot:', error);
      alert('Erro ao excluir horário. Tente novamente.');
    }
  };

  const handleEmptyCellClick = (day: string, time: string) => {
    setSelectedDay(day);
    setSelectedTime(time);
    setNewSlotFormData({ teacherId: '', subject: '', room: '' });
    setShowAddSlotModal(true);
  };

  const handleAddSlot = async () => {
    if (!newSlotFormData.teacherId || !newSlotFormData.subject || !newSlotFormData.room) {
      alert('Por favor, preencha todos os campos obrigatórios.');
      return;
    }

    // Ensure subject is from the registered list
    const isValidSubject = subjects.some(subject => subject.name === newSlotFormData.subject);
    if (!isValidSubject) {
      alert('Por favor, selecione uma disciplina válida da lista.');
      return;
    }

    // Ensure room is from the registered list
    const isValidRoom = rooms.some(room => room.name === newSlotFormData.room);
    if (!isValidRoom) {
      alert('Por favor, selecione uma sala válida da lista.');
      return;
    }

    try {
      // Check if there's already a slot for this teacher at this time
      const existingSlots = allTimeSlots.filter(
        (slot) =>
          slot.teacherId === newSlotFormData.teacherId &&
          slot.day === selectedDay &&
          slot.time === selectedTime
      );

      if (existingSlots.length > 0) {
        alert('Este professor já possui um horário neste dia e horário.');
        return;
      }

      await addDoc(collection(db, 'timetable'), {
        teacherId: newSlotFormData.teacherId,
        day: selectedDay,
        time: selectedTime,
        subject: newSlotFormData.subject,
        room: newSlotFormData.room,
        createdAt: Timestamp.now(),
      });

      await loadAllTimeSlots();
      setShowAddSlotModal(false);
      setNewSlotFormData({ teacherId: '', subject: '', room: '' });
      setSelectedDay('');
      setSelectedTime('');
    } catch (error) {
      console.error('Error adding slot:', error);
      alert('Erro ao adicionar horário. Tente novamente.');
    }
  };

  const handleCPFChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let value = e.target.value;
    value = value.replace(/\D/g, '');
    if (value.length <= 11) {
      setProfileData({ ...profileData, cpf: value });
      setCpfError('');
      setProfileError('');
    }
  };

  useEffect(() => {
    if (profileData.cpf.length === 11) {
      if (!validateCPF(profileData.cpf)) {
        setCpfError('CPF inválido. Verifique se o CPF está correto.');
      } else {
        setCpfError('');
      }
    } else if (profileData.cpf.length > 0 && profileData.cpf.length < 11) {
      setCpfError('');
    }
  }, [profileData.cpf]);

  useEffect(() => {
    if (profileData.password) {
      const passwordValidation = validatePassword(profileData.password);
      if (!passwordValidation.valid) {
        setPasswordError(passwordValidation.errors.join('. '));
      } else {
        setPasswordError('');
      }
    } else {
      setPasswordError('');
    }
  }, [profileData.password]);

  const handleProfileUpdate = async () => {
    setProfileError('');
    setProfileSuccess('');
    setProfileLoading(true);

    try {
      const updates: { name?: string; cpf?: string; password?: string; currentPassword?: string } = {};

      // Only include fields that have changed
      if (profileData.name.trim() !== (userName || '')) {
        updates.name = profileData.name;
      }

      if (profileData.cpf && profileData.cpf.length === 11 && formatCPF(profileData.cpf) !== userCPF) {
        if (!validateCPF(profileData.cpf)) {
          throw new Error('CPF inválido. Verifique se o CPF está correto.');
        }
        updates.cpf = profileData.cpf;
      }

      if (profileData.password) {
        // Validation is already done in useEffect, but double-check here
        if (passwordError) {
          setProfileLoading(false);
          return;
        }
        updates.password = profileData.password;
      }

      // If password or CPF is being changed, current password is required
      if (updates.password || updates.cpf) {
        if (!profileData.currentPassword) {
          throw new Error('É necessário informar a senha atual para alterar a senha ou CPF.');
        }
        updates.currentPassword = profileData.currentPassword;
      }

      // Check if there are any changes
      if (Object.keys(updates).length === 0 || (Object.keys(updates).length === 1 && updates.currentPassword)) {
        setProfileError('Nenhuma alteração foi feita.');
        setProfileLoading(false);
        return;
      }

      await updateProfile(updates);
      setProfileSuccess('Perfil atualizado com sucesso!');
      setProfileData({ name: '', cpf: '', password: '', currentPassword: '' });
      setPasswordError('');
      setTimeout(() => {
        setShowProfileModal(false);
        setProfileSuccess('');
      }, 1500);
    } catch (error: any) {
      setProfileError(error.message || 'Erro ao atualizar perfil. Tente novamente.');
    } finally {
      setProfileLoading(false);
    }
  };

  const handleDeleteRoom = async (roomId: string) => {
    if (!window.confirm('Tem certeza que deseja excluir esta sala?')) {
      return;
    }

    try {
      await deleteDoc(doc(db, 'rooms', roomId));
      await loadRooms();
    } catch (error) {
      console.error('Error deleting room:', error);
      alert('Erro ao excluir sala. Tente novamente.');
    }
  };

  const getTeacherName = (teacherId: string) => {
    const teacher = teachers.find((t) => t.userId === teacherId);
    if (!teacher) return 'Desconhecido';
    // Return name if available, otherwise fall back to CPF
    return teacher.name || displayCPF(teacher.cpf);
  };

  const getFilteredTimeSlots = () => {
    if (selectedTeacher === 'all') {
      return allTimeSlots;
    }
    return allTimeSlots.filter((slot) => slot.teacherId === selectedTeacher);
  };


  const filteredTimeSlots = getFilteredTimeSlots();
  const uniqueTeachersInSlots = Array.from(
    new Set(filteredTimeSlots.map((slot) => slot.teacherId))
  );

  // Function to check if a time slot has conflicts
  const hasConflict = (day: string, time: string) => {
    const slotsAtThisTime = filteredTimeSlots.filter(
      (slot) => slot.day === day && slot.time === time
    );
    
    // Conflict if there are 2+ slots at the same time
    if (slotsAtThisTime.length >= 2) {
      // Check for room conflicts (same room used by different teachers)
      const roomsUsed = slotsAtThisTime.map(slot => slot.room);
      const uniqueRooms = new Set(roomsUsed);
      // If there are fewer unique rooms than slots, there's a room conflict
      if (uniqueRooms.size < roomsUsed.length) {
        return { hasConflict: true, type: 'room' };
      }
      // Otherwise, it's a general conflict (multiple teachers at same time)
      return { hasConflict: true, type: 'general' };
    }
    return { hasConflict: false, type: null };
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <header className="bg-gradient-to-r from-primary-500 to-purple-600 dark:from-gray-800 dark:to-gray-900 text-white shadow-lg">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold">Coordinator Dashboard</h1>
          <div className="flex items-center gap-4">
            <span className="text-sm opacity-90">
              {userName || (userCPF ? displayCPF(userCPF) : 'Usuário')}
            </span>
            <button
              onClick={() => {
                setProfileData({ name: userName || '', cpf: userCPF || '', password: '', currentPassword: '' });
                setProfileError('');
                setProfileSuccess('');
                setCpfError('');
                setPasswordError('');
                setShowProfileModal(true);
              }}
              className="px-4 py-2 bg-white/20 hover:bg-white/30 rounded-lg transition-colors font-medium text-sm"
              title="Editar perfil"
            >
              Perfil
            </button>
            <button
              onClick={toggleTheme}
              className="p-2 bg-white/20 hover:bg-white/30 rounded-lg transition-colors text-xl"
              title={theme === 'light' ? 'Ativar tema escuro' : 'Ativar tema claro'}
            >
              {theme === 'light' ? '🌙' : '☀️'}
            </button>
            <button
              onClick={logout}
              className="px-4 py-2 bg-white/20 hover:bg-white/30 rounded-lg transition-colors font-medium"
            >
              Sair
            </button>
          </div>
        </div>
      </header>

      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 shadow-sm">
        <div className="container mx-auto px-4">
          <div className="flex gap-2 overflow-x-auto">
            <button
              className={`px-6 py-3 font-medium rounded-t-lg transition-all whitespace-nowrap ${
                activeTab === 'subjects'
                  ? 'bg-gradient-to-r from-primary-500 to-purple-600 text-white shadow-md'
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
              }`}
              onClick={() => setActiveTab('subjects')}
            >
              Gerenciar Disciplinas
            </button>
            <button
              className={`px-6 py-3 font-medium rounded-t-lg transition-all whitespace-nowrap ${
                activeTab === 'rooms'
                  ? 'bg-gradient-to-r from-primary-500 to-purple-600 text-white shadow-md'
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
              }`}
              onClick={() => setActiveTab('rooms')}
            >
              Gerenciar Salas
            </button>
            <button
              className={`px-6 py-3 font-medium rounded-t-lg transition-all whitespace-nowrap ${
                activeTab === 'timetables'
                  ? 'bg-gradient-to-r from-primary-500 to-purple-600 text-white shadow-md'
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
              }`}
              onClick={() => setActiveTab('timetables')}
            >
              Ver Horários dos Professores
            </button>
          </div>
        </div>
      </div>

      {activeTab === 'subjects' && (
        <div className="container mx-auto px-4 py-8">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Disciplinas Cadastradas</h2>
            <button
              className="px-4 py-2 bg-gradient-to-r from-primary-500 to-purple-600 hover:from-primary-600 hover:to-purple-700 text-white rounded-lg font-medium shadow-lg transition-all"
              onClick={() => setShowAddSubjectModal(true)}
            >
              + Adicionar Disciplina
            </button>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg overflow-hidden">
            {subjects.length === 0 ? (
              <div className="p-12 text-center text-gray-500 dark:text-gray-400">
                Nenhuma disciplina cadastrada ainda.
              </div>
            ) : (
              <table className="w-full">
                <thead className="bg-gradient-to-r from-primary-500 to-purple-600 dark:from-gray-700 dark:to-gray-800 text-white">
                  <tr>
                    <th className="px-6 py-4 text-left font-semibold">Nome</th>
                    <th className="px-6 py-4 text-left font-semibold">Código</th>
                    <th className="px-6 py-4 text-center font-semibold">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                  {subjects.map((subject) => (
                    <tr key={subject.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                      <td className="px-6 py-4 text-gray-900 dark:text-white font-medium">{subject.name}</td>
                      <td className="px-6 py-4 text-gray-600 dark:text-gray-400">{subject.code || '-'}</td>
                      <td className="px-6 py-4">
                        <div className="flex gap-2 justify-center">
                          <button
                            className="px-3 py-1.5 bg-primary-500 hover:bg-primary-600 text-white rounded-lg text-sm font-medium transition-colors"
                            onClick={() => handleEditSubject(subject)}
                          >
                            Editar
                          </button>
                          <button
                            className="px-3 py-1.5 bg-red-500 hover:bg-red-600 text-white rounded-lg text-sm font-medium transition-colors"
                            onClick={() => subject.id && handleDeleteSubject(subject.id)}
                          >
                            Excluir
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {activeTab === 'rooms' && (
        <div className="container mx-auto px-4 py-8">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Salas Cadastradas</h2>
            <button
              className="px-4 py-2 bg-gradient-to-r from-primary-500 to-purple-600 hover:from-primary-600 hover:to-purple-700 text-white rounded-lg font-medium shadow-lg transition-all"
              onClick={() => setShowAddRoomModal(true)}
            >
              + Adicionar Sala
            </button>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg overflow-hidden">
            {rooms.length === 0 ? (
              <div className="p-12 text-center text-gray-500 dark:text-gray-400">
                Nenhuma sala cadastrada ainda.
              </div>
            ) : (
              <table className="w-full">
                <thead className="bg-gradient-to-r from-primary-500 to-purple-600 dark:from-gray-700 dark:to-gray-800 text-white">
                  <tr>
                    <th className="px-6 py-4 text-left font-semibold">Nome</th>
                    <th className="px-6 py-4 text-left font-semibold">Código</th>
                    <th className="px-6 py-4 text-center font-semibold">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                  {rooms.map((room) => (
                    <tr key={room.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                      <td className="px-6 py-4 text-gray-900 dark:text-white font-medium">{room.name}</td>
                      <td className="px-6 py-4 text-gray-600 dark:text-gray-400">{room.code || '-'}</td>
                      <td className="px-6 py-4">
                        <div className="flex gap-2 justify-center">
                          <button
                            className="px-3 py-1.5 bg-primary-500 hover:bg-primary-600 text-white rounded-lg text-sm font-medium transition-colors"
                            onClick={() => handleEditRoom(room)}
                          >
                            Editar
                          </button>
                          <button
                            className="px-3 py-1.5 bg-red-500 hover:bg-red-600 text-white rounded-lg text-sm font-medium transition-colors"
                            onClick={() => room.id && handleDeleteRoom(room.id)}
                          >
                            Excluir
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {activeTab === 'timetables' && (
        <div className="container mx-auto px-4 py-8">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 mb-6">
            <div className="flex items-center gap-4">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Filtrar por professor:
              </label>
              <select
                value={selectedTeacher}
                onChange={(e) => setSelectedTeacher(e.target.value as string | 'all')}
                className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white min-w-[250px]"
              >
                <option value="all">Todos os professores</option>
                {teachers
                  .filter((t) => uniqueTeachersInSlots.includes(t.userId))
                  .map((teacher) => (
                    <option key={teacher.userId} value={teacher.userId}>
                      {teacher.name || displayCPF(teacher.cpf)}
                    </option>
                  ))}
              </select>
            </div>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="text-lg text-gray-600 dark:text-gray-400">Carregando horários...</div>
            </div>
          ) : (
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg overflow-hidden">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="bg-gradient-to-r from-primary-500 to-purple-600 dark:from-gray-700 dark:to-gray-800 text-white">
                    <th className="px-4 py-3 text-left font-semibold w-32">Horário</th>
                    {DAYS.map((day) => (
                      <th key={day} className="px-3 py-3 text-center font-semibold text-sm">
                        {day}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {TIME_SLOTS.map((time) => (
                    <tr key={time} className="border-b border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                      <td className="px-4 py-4 bg-gray-100 dark:bg-gray-800 font-medium text-sm text-gray-700 dark:text-gray-300">
                        {time}
                      </td>
                      {DAYS.map((day) => {
                        const slots = filteredTimeSlots.filter(
                          (slot) => slot.day === day && slot.time === time
                        );
                        const conflict = hasConflict(day, time);
                        return (
                          <td 
                            key={`${day}-${time}`} 
                            className={`px-2 py-2 min-w-[120px] border-r border-gray-200 dark:border-gray-700 last:border-r-0 ${
                              conflict.hasConflict ? 'bg-red-50 dark:bg-red-900/20' : ''
                            }`}
                          >
                            {slots.length > 0 ? (
                              <div className="flex flex-col gap-2">
                                {conflict.hasConflict && (
                                  <div className="px-2 py-1 bg-red-500 dark:bg-red-600 text-white text-[10px] font-semibold rounded mb-1 flex items-center gap-1">
                                    <span>⚠️</span>
                                    <span>CONFLITO {conflict.type === 'room' ? 'DE SALA' : ''}</span>
                                  </div>
                                )}
                                {slots.map((slot) => (
                                  <div
                                    key={slot.id}
                                    className={`relative p-2.5 rounded-lg shadow-md hover:shadow-lg transition-all hover:scale-[1.02] cursor-pointer text-xs ${
                                      conflict.hasConflict
                                        ? 'bg-gradient-to-br from-red-500 to-red-600 dark:from-red-600 dark:to-red-700 text-white'
                                        : 'bg-gradient-to-br from-primary-500 to-purple-600 dark:from-primary-600 dark:to-purple-700 text-white'
                                    }`}
                                    onClick={() => handleSlotClick(slot)}
                                  >
                                    <div className="font-semibold mb-0.5">{slot.subject}</div>
                                    <div className="opacity-90 text-[10px]">Sala: {slot.room}</div>
                                    <div className="opacity-85 text-[10px] italic mt-0.5">
                                      Prof: {getTeacherName(slot.teacherId)}
                                    </div>
                                    <button
                                      className="absolute top-1 right-1 w-5 h-5 bg-white/20 hover:bg-white/30 rounded-full flex items-center justify-center text-sm leading-none transition-colors"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        if (slot.id) handleDeleteSlot(slot.id);
                                      }}
                                    >
                                      ×
                                    </button>
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <div
                                className="p-2 text-center text-gray-400 dark:text-gray-500 text-xs border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg hover:border-primary-400 dark:hover:border-primary-500 cursor-pointer transition-colors"
                                onClick={() => handleEmptyCellClick(day, time)}
                                title="Clique para adicionar um horário"
                              >
                                + Adicionar
                              </div>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {showAddSubjectModal && (
        <div
          className="fixed inset-0 bg-black/50 dark:bg-black/70 flex items-center justify-center z-50 p-4"
          onClick={() => {
            setShowAddSubjectModal(false);
            setEditingSubjectId(null);
            setNewSubjectName('');
            setNewSubjectCode('');
          }}
        >
          <div
            className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-md p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
              {editingSubjectId ? 'Editar Disciplina' : 'Adicionar Disciplina'}
            </h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Nome da Disciplina *
                </label>
                <input
                  type="text"
                  value={newSubjectName}
                  onChange={(e) => setNewSubjectName(e.target.value)}
                  placeholder="Ex: Matemática"
                  autoFocus
                  className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white transition-all"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Código (opcional)
                </label>
                <input
                  type="text"
                  value={newSubjectCode}
                  onChange={(e) => setNewSubjectCode(e.target.value)}
                  placeholder="Ex: MAT101"
                  className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white transition-all"
                />
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => {
                  setShowAddSubjectModal(false);
                  setEditingSubjectId(null);
                  setNewSubjectName('');
                  setNewSubjectCode('');
                }}
                className="flex-1 px-4 py-2.5 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-800 dark:text-gray-200 rounded-lg font-medium transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={editingSubjectId ? handleUpdateSubject : handleAddSubject}
                className="flex-1 px-4 py-2.5 bg-gradient-to-r from-primary-500 to-purple-600 hover:from-primary-600 hover:to-purple-700 text-white rounded-lg font-medium shadow-lg transition-all"
              >
                {editingSubjectId ? 'Atualizar' : 'Salvar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {showAddRoomModal && (
        <div
          className="fixed inset-0 bg-black/50 dark:bg-black/70 flex items-center justify-center z-50 p-4"
          onClick={() => {
            setShowAddRoomModal(false);
            setEditingRoomId(null);
            setNewRoomName('');
            setNewRoomCode('');
          }}
        >
          <div
            className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-md p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
              {editingRoomId ? 'Editar Sala' : 'Adicionar Sala'}
            </h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Nome da Sala *
                </label>
                <input
                  type="text"
                  value={newRoomName}
                  onChange={(e) => setNewRoomName(e.target.value)}
                  placeholder="Ex: Sala 101"
                  autoFocus
                  className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white transition-all"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Código (opcional)
                </label>
                <input
                  type="text"
                  value={newRoomCode}
                  onChange={(e) => setNewRoomCode(e.target.value)}
                  placeholder="Ex: A101"
                  className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white transition-all"
                />
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => {
                  setShowAddRoomModal(false);
                  setEditingRoomId(null);
                  setNewRoomName('');
                  setNewRoomCode('');
                }}
                className="flex-1 px-4 py-2.5 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-800 dark:text-gray-200 rounded-lg font-medium transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={editingRoomId ? handleUpdateRoom : handleAddRoom}
                className="flex-1 px-4 py-2.5 bg-gradient-to-r from-primary-500 to-purple-600 hover:from-primary-600 hover:to-purple-700 text-white rounded-lg font-medium shadow-lg transition-all"
              >
                {editingRoomId ? 'Atualizar' : 'Salvar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {showEditSlotModal && editingSlot && (
        <div
          className="fixed inset-0 bg-black/50 dark:bg-black/70 flex items-center justify-center z-50 p-4"
          onClick={() => {
            setShowEditSlotModal(false);
            setEditingSlot(null);
            setSlotFormData({ subject: '', room: '' });
          }}
        >
          <div
            className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-md p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
              Editar Horário
            </h2>
            <p className="text-gray-600 dark:text-gray-400 mb-1">
              {editingSlot.day} - {editingSlot.time}
            </p>
            <p className="text-sm text-gray-500 dark:text-gray-500 mb-6">
              Professor: {getTeacherName(editingSlot.teacherId)}
            </p>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Disciplina *
                </label>
                {subjects.length > 0 ? (
                  <select
                    value={slotFormData.subject}
                    onChange={(e) => setSlotFormData({ ...slotFormData, subject: e.target.value })}
                    className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white transition-all"
                    required
                  >
                    <option value="">Selecione uma disciplina</option>
                    {subjects.map((subject) => (
                      <option key={subject.id} value={subject.name}>
                        {subject.name} {subject.code ? `(${subject.code})` : ''}
                      </option>
                    ))}
                  </select>
                ) : (
                  <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg text-sm text-yellow-800 dark:text-yellow-300">
                    Nenhuma disciplina cadastrada.
                  </div>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Sala *
                </label>
                {rooms.length > 0 ? (
                  <select
                    value={slotFormData.room}
                    onChange={(e) => setSlotFormData({ ...slotFormData, room: e.target.value })}
                    className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white transition-all"
                    required
                  >
                    <option value="">Selecione uma sala</option>
                    {rooms.map((room) => (
                      <option key={room.id} value={room.name}>
                        {room.name} {room.code ? `(${room.code})` : ''}
                      </option>
                    ))}
                  </select>
                ) : (
                  <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg text-sm text-yellow-800 dark:text-yellow-300">
                    Nenhuma sala cadastrada.
                  </div>
                )}
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => {
                  setShowEditSlotModal(false);
                  setEditingSlot(null);
                  setSlotFormData({ subject: '', room: '' });
                }}
                className="flex-1 px-4 py-2.5 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-800 dark:text-gray-200 rounded-lg font-medium transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleUpdateSlot}
                className="flex-1 px-4 py-2.5 bg-gradient-to-r from-primary-500 to-purple-600 hover:from-primary-600 hover:to-purple-700 text-white rounded-lg font-medium shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={subjects.length === 0 || rooms.length === 0}
              >
                Atualizar
              </button>
            </div>
          </div>
        </div>
      )}

      {showAddSlotModal && (
        <div
          className="fixed inset-0 bg-black/50 dark:bg-black/70 flex items-center justify-center z-50 p-4"
          onClick={() => {
            setShowAddSlotModal(false);
            setNewSlotFormData({ teacherId: '', subject: '', room: '' });
            setSelectedDay('');
            setSelectedTime('');
          }}
        >
          <div
            className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-md p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
              Adicionar Horário
            </h2>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              {selectedDay} - {selectedTime}
            </p>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Professor *
                </label>
                {teachers.length > 0 ? (
                  <select
                    value={newSlotFormData.teacherId}
                    onChange={(e) => setNewSlotFormData({ ...newSlotFormData, teacherId: e.target.value })}
                    className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white transition-all"
                    required
                  >
                    <option value="">Selecione um professor</option>
                    {teachers.map((teacher) => (
                      <option key={teacher.userId} value={teacher.userId}>
                        {teacher.name || displayCPF(teacher.cpf)}
                      </option>
                    ))}
                  </select>
                ) : (
                  <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg text-sm text-yellow-800 dark:text-yellow-300">
                    Nenhum professor cadastrado.
                  </div>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Disciplina *
                </label>
                {subjects.length > 0 ? (
                  <select
                    value={newSlotFormData.subject}
                    onChange={(e) => setNewSlotFormData({ ...newSlotFormData, subject: e.target.value })}
                    className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white transition-all"
                    required
                  >
                    <option value="">Selecione uma disciplina</option>
                    {subjects.map((subject) => (
                      <option key={subject.id} value={subject.name}>
                        {subject.name} {subject.code ? `(${subject.code})` : ''}
                      </option>
                    ))}
                  </select>
                ) : (
                  <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg text-sm text-yellow-800 dark:text-yellow-300">
                    Nenhuma disciplina cadastrada.
                  </div>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Sala *
                </label>
                {rooms.length > 0 ? (
                  <select
                    value={newSlotFormData.room}
                    onChange={(e) => setNewSlotFormData({ ...newSlotFormData, room: e.target.value })}
                    className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white transition-all"
                    required
                  >
                    <option value="">Selecione uma sala</option>
                    {rooms.map((room) => (
                      <option key={room.id} value={room.name}>
                        {room.name} {room.code ? `(${room.code})` : ''}
                      </option>
                    ))}
                  </select>
                ) : (
                  <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg text-sm text-yellow-800 dark:text-yellow-300">
                    Nenhuma sala cadastrada.
                  </div>
                )}
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => {
                  setShowAddSlotModal(false);
                  setNewSlotFormData({ teacherId: '', subject: '', room: '' });
                  setSelectedDay('');
                  setSelectedTime('');
                }}
                className="flex-1 px-4 py-2.5 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-800 dark:text-gray-200 rounded-lg font-medium transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleAddSlot}
                className="flex-1 px-4 py-2.5 bg-gradient-to-r from-primary-500 to-purple-600 hover:from-primary-600 hover:to-purple-700 text-white rounded-lg font-medium shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={teachers.length === 0 || subjects.length === 0 || rooms.length === 0}
              >
                Adicionar
              </button>
            </div>
          </div>
        </div>
      )}

      {showProfileModal && (
        <div
          className="fixed inset-0 bg-black/50 dark:bg-black/70 flex items-center justify-center z-50 p-4"
          onClick={() => {
            setShowProfileModal(false);
            setProfileData({ name: '', cpf: '', password: '', currentPassword: '' });
            setProfileError('');
            setProfileSuccess('');
            setCpfError('');
            setPasswordError('');
          }}
        >
          <div
            className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-md p-6 max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
              Editar Perfil
            </h2>

            {profileError && (
              <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 rounded-lg text-sm">
                {profileError}
              </div>
            )}

            {profileSuccess && (
              <div className="mb-4 p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 text-green-700 dark:text-green-400 rounded-lg text-sm">
                {profileSuccess}
              </div>
            )}

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Nome Completo
                </label>
                <input
                  type="text"
                  value={profileData.name}
                  onChange={(e) => setProfileData({ ...profileData, name: e.target.value })}
                  placeholder="Digite seu nome completo"
                  className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white transition-all"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  CPF
                </label>
                <input
                  type="text"
                  value={displayCPF(profileData.cpf)}
                  onChange={handleCPFChange}
                  placeholder="000.000.000-00"
                  maxLength={14}
                  className={`w-full px-4 py-2.5 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white transition-all ${
                    cpfError
                      ? 'border-red-500 dark:border-red-500'
                      : 'border-gray-300 dark:border-gray-600'
                  }`}
                />
                {cpfError && (
                  <div className="mt-1 text-xs text-red-600 dark:text-red-400">{cpfError}</div>
                )}
                {profileData.cpf.length === 11 && !cpfError && (
                  <div className="mt-1 text-xs text-green-600 dark:text-green-400">CPF válido</div>
                )}
                <small className="block mt-1 text-xs text-gray-500 dark:text-gray-400">
                  Deixe em branco para manter o CPF atual
                </small>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Nova Senha
                </label>
                <input
                  type="password"
                  value={profileData.password}
                  onChange={(e) => {
                    setProfileData({ ...profileData, password: e.target.value });
                    setPasswordError('');
                    setProfileError('');
                  }}
                  placeholder="Mínimo 8 caracteres, 1 maiúscula, 1 minúscula, 1 número, 1 símbolo"
                  minLength={8}
                  className={`w-full px-4 py-2.5 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white transition-all ${
                    passwordError
                      ? 'border-red-500 dark:border-red-500'
                      : 'border-gray-300 dark:border-gray-600'
                  }`}
                />
                <small className="block mt-1 text-xs text-gray-500 dark:text-gray-400">
                  Deixe em branco para manter a senha atual. A senha deve ter pelo menos 8 caracteres, incluindo 1 maiúscula, 1 minúscula, 1 número e 1 símbolo
                </small>
                {passwordError && (
                  <div className="mt-1 text-xs text-red-600 dark:text-red-400">{passwordError}</div>
                )}
                {profileData.password && !passwordError && validatePassword(profileData.password).valid && (
                  <div className="mt-1 text-xs text-green-600 dark:text-green-400">Senha válida</div>
                )}
              </div>

              {(profileData.password || (profileData.cpf && profileData.cpf.length === 11 && formatCPF(profileData.cpf) !== userCPF)) && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Senha Atual *
                  </label>
                  <input
                    type="password"
                    value={profileData.currentPassword}
                    onChange={(e) => setProfileData({ ...profileData, currentPassword: e.target.value })}
                    placeholder="Digite sua senha atual"
                    required
                    className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white transition-all"
                  />
                  <small className="block mt-1 text-xs text-gray-500 dark:text-gray-400">
                    Necessário para alterar senha ou CPF
                  </small>
                </div>
              )}
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => {
                  setShowProfileModal(false);
                  setProfileData({ name: '', cpf: '', password: '', currentPassword: '' });
                  setProfileError('');
                  setProfileSuccess('');
                  setCpfError('');
                  setPasswordError('');
                }}
                className="flex-1 px-4 py-2.5 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-800 dark:text-gray-200 rounded-lg font-medium transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleProfileUpdate}
                disabled={profileLoading || !!cpfError || !!passwordError}
                className="flex-1 px-4 py-2.5 bg-gradient-to-r from-primary-500 to-purple-600 hover:from-primary-600 hover:to-purple-700 text-white rounded-lg font-medium shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {profileLoading ? 'Salvando...' : 'Salvar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

