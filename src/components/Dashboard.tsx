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

export default function Dashboard() {
  const { currentUser, logout, userName, userCPF, updateProfile } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const [timeSlots, setTimeSlots] = useState<TimeSlot[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState<{ day: string; time: string } | null>(null);
  const [editingSlotId, setEditingSlotId] = useState<string | null>(null);
  const [formData, setFormData] = useState({ subject: '', room: '' });
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [profileData, setProfileData] = useState({ name: '', cpf: '', currentPassword: '', password: '', confirmPassword: '' });
  const [profileError, setProfileError] = useState('');
  const [profileSuccess, setProfileSuccess] = useState('');
  const [profileLoading, setProfileLoading] = useState(false);
  const [cpfError, setCpfError] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [confirmPasswordError, setConfirmPasswordError] = useState('');

  useEffect(() => {
    if (currentUser) {
      loadTimeSlots();
      loadSubjects();
      loadRooms();
    }
  }, [currentUser]);

  const loadTimeSlots = async () => {
    if (!currentUser) return;
    
    try {
      const q = query(collection(db, 'timetable'));
      const querySnapshot = await getDocs(q);
      const slots: TimeSlot[] = [];
      querySnapshot.forEach((doc) => {
        const data = doc.data() as TimeSlot;
        // Only load slots for the current user
        if (data.teacherId === currentUser.uid) {
          slots.push({ id: doc.id, ...data });
        }
      });
      setTimeSlots(slots);
    } catch (error) {
      console.error('Error loading timetable:', error);
    } finally {
      setLoading(false);
    }
  };

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

  const getSlotForCell = (day: string, time: string) => {
    return timeSlots.find(
      (slot) => slot.day === day && slot.time === time && slot.teacherId === currentUser?.uid
    );
  };

  const handleCellClick = (day: string, time: string) => {
    const existingSlot = getSlotForCell(day, time);
    setSelectedSlot({ day, time });
    
    if (existingSlot) {
      // If slot exists, prepare for editing
      setEditingSlotId(existingSlot.id || null);
      setFormData({
        subject: existingSlot.subject,
        room: existingSlot.room,
      });
    } else {
      // If slot is empty, prepare for adding
      setEditingSlotId(null);
      setFormData({ subject: '', room: '' });
    }
    
    setShowAddModal(true);
  };

  const handleAddSlot = async () => {
    if (!currentUser || !selectedSlot || !formData.subject || !formData.room) {
      alert('Por favor, preencha todos os campos obrigatórios.');
      return;
    }
    
    // Ensure subject is from the registered list
    const isValidSubject = subjects.some(subject => subject.name === formData.subject);
    if (!isValidSubject) {
      alert('Por favor, selecione uma disciplina válida da lista.');
      return;
    }
    
    // Ensure room is from the registered list
    const isValidRoom = rooms.some(room => room.name === formData.room);
    if (!isValidRoom) {
      alert('Por favor, selecione uma sala válida da lista.');
      return;
    }

    try {
      await addDoc(collection(db, 'timetable'), {
        teacherId: currentUser.uid,
        day: selectedSlot.day,
        time: selectedSlot.time,
        subject: formData.subject,
        room: formData.room,
        createdAt: Timestamp.now(),
      });
      await loadTimeSlots();
      setShowAddModal(false);
      setFormData({ subject: '', room: '' });
      setEditingSlotId(null);
    } catch (error) {
      console.error('Error adding slot:', error);
    }
  };

  const handleUpdateSlot = async () => {
    if (!editingSlotId || !formData.subject || !formData.room) {
      alert('Por favor, preencha todos os campos obrigatórios.');
      return;
    }
    
    // Ensure subject is from the registered list
    const isValidSubject = subjects.some(subject => subject.name === formData.subject);
    if (!isValidSubject) {
      alert('Por favor, selecione uma disciplina válida da lista.');
      return;
    }
    
    // Ensure room is from the registered list
    const isValidRoom = rooms.some(room => room.name === formData.room);
    if (!isValidRoom) {
      alert('Por favor, selecione uma sala válida da lista.');
      return;
    }

    try {
      const slotRef = doc(db, 'timetable', editingSlotId);
      await updateDoc(slotRef, {
        subject: formData.subject,
        room: formData.room,
      });
      await loadTimeSlots();
      setShowAddModal(false);
      setFormData({ subject: '', room: '' });
      setEditingSlotId(null);
    } catch (error) {
      console.error('Error updating slot:', error);
    }
  };

  const handleDeleteSlot = async (slotId: string) => {
    if (!window.confirm('Are you sure you want to delete this slot?')) {
      return;
    }

    try {
      await deleteDoc(doc(db, 'timetable', slotId));
      await loadTimeSlots();
    } catch (error) {
      console.error('Error deleting slot:', error);
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

  useEffect(() => {
    if (profileData.confirmPassword) {
      if (profileData.password !== profileData.confirmPassword) {
        setConfirmPasswordError('As senhas não coincidem');
      } else {
        setConfirmPasswordError('');
      }
    } else {
      setConfirmPasswordError('');
    }
  }, [profileData.confirmPassword, profileData.password]);

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
        if (profileData.password !== profileData.confirmPassword) {
          setConfirmPasswordError('As senhas não coincidem');
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
      setProfileData({ name: '', cpf: '', currentPassword: '', password: '', confirmPassword: '' });
      setPasswordError('');
      setConfirmPasswordError('');
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

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="text-lg text-gray-600 dark:text-gray-400">Carregando horários...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <header className="bg-gradient-to-r from-primary-500 to-purple-600 dark:from-gray-800 dark:to-gray-900 text-white shadow-lg">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold">Teachers Timetable Dashboard</h1>
          <div className="flex items-center gap-4">
            <span className="text-sm opacity-90">
              {userName || (userCPF ? displayCPF(userCPF) : 'Usuário')}
            </span>
            <button
              onClick={() => {
                setProfileData({ name: userName || '', cpf: userCPF || '', currentPassword: '', password: '', confirmPassword: '' });
                setProfileError('');
                setProfileSuccess('');
                setCpfError('');
                setPasswordError('');
                setConfirmPasswordError('');
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

      <div className="container mx-auto px-4 py-8 overflow-x-auto">
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
                    const slot = getSlotForCell(day, time);
                    return (
                      <td
                        key={`${day}-${time}`}
                        className="px-2 py-2 min-w-[120px] cursor-pointer border-r border-gray-200 dark:border-gray-700 last:border-r-0"
                        onClick={() => handleCellClick(day, time)}
                      >
                        {slot ? (
                          <div className="relative p-3 bg-gradient-to-br from-primary-500 to-purple-600 dark:from-primary-600 dark:to-purple-700 text-white rounded-lg shadow-md hover:shadow-lg transition-all hover:scale-[1.02]">
                            <div className="font-semibold text-sm mb-1">{slot.subject}</div>
                            <div className="text-xs opacity-90">Sala: {slot.room}</div>
                            <button
                              className="absolute top-1 right-1 w-6 h-6 bg-white/20 hover:bg-white/30 rounded-full flex items-center justify-center text-lg leading-none transition-colors"
                              onClick={(e) => {
                                e.stopPropagation();
                                if (slot.id) handleDeleteSlot(slot.id);
                              }}
                            >
                              ×
                            </button>
                          </div>
                        ) : (
                          <div className="p-3 text-center text-gray-400 dark:text-gray-500 text-sm border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg hover:border-primary-400 dark:hover:border-primary-500 transition-colors">
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
      </div>

      {showAddModal && (
        <div
          className="fixed inset-0 bg-black/50 dark:bg-black/70 flex items-center justify-center z-50 p-4"
          onClick={() => {
            setShowAddModal(false);
            setEditingSlotId(null);
            setFormData({ subject: '', room: '' });
          }}
        >
          <div
            className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-md p-6 transform transition-all"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
              {editingSlotId ? 'Editar Horário' : 'Adicionar Horário'}
            </h2>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              {selectedSlot?.day} - {selectedSlot?.time}
            </p>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Disciplina *
                </label>
                {subjects.length > 0 ? (
                  <select
                    value={formData.subject}
                    onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
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
                    Nenhuma disciplina cadastrada. Entre em contato com o coordenador para registrar disciplinas.
                  </div>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Sala *
                </label>
                {rooms.length > 0 ? (
                  <select
                    value={formData.room}
                    onChange={(e) => setFormData({ ...formData, room: e.target.value })}
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
                    Nenhuma sala cadastrada. Entre em contato com o coordenador para registrar salas.
                  </div>
                )}
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => {
                  setShowAddModal(false);
                  setEditingSlotId(null);
                  setFormData({ subject: '', room: '' });
                }}
                className="flex-1 px-4 py-2.5 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-800 dark:text-gray-200 rounded-lg font-medium transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={editingSlotId ? handleUpdateSlot : handleAddSlot}
                className="flex-1 px-4 py-2.5 bg-gradient-to-r from-primary-500 to-purple-600 hover:from-primary-600 hover:to-purple-700 text-white rounded-lg font-medium shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={subjects.length === 0 || rooms.length === 0}
              >
                {editingSlotId ? 'Atualizar' : 'Salvar'}
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
            setProfileData({ name: '', cpf: '', currentPassword: '', password: '', confirmPassword: '' });
            setProfileError('');
            setProfileSuccess('');
            setCpfError('');
            setPasswordError('');
            setConfirmPasswordError('');
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
                  setProfileData({ name: '', cpf: '', currentPassword: '', password: '', confirmPassword: '' });
                  setProfileError('');
                  setProfileSuccess('');
                  setCpfError('');
                  setPasswordError('');
                  setConfirmPasswordError('');
                }}
                className="flex-1 px-4 py-2.5 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-800 dark:text-gray-200 rounded-lg font-medium transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleProfileUpdate}
                disabled={profileLoading || !!cpfError || !!passwordError || !!confirmPasswordError}
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
