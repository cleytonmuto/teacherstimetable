import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { db } from '../config/firebase';
import { displayCPF } from '../utils/cpfUtils';
import {
  collection,
  query,
  getDocs,
  addDoc,
  deleteDoc,
  doc,
  Timestamp,
} from 'firebase/firestore';
import './Dashboard.css';

interface TimeSlot {
  id?: string;
  teacherId: string;
  day: string;
  time: string;
  subject: string;
  room: string;
}

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
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
  const { currentUser, logout, userCPF } = useAuth();
  const [timeSlots, setTimeSlots] = useState<TimeSlot[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState<{ day: string; time: string } | null>(null);
  const [formData, setFormData] = useState({ subject: '', room: '' });

  useEffect(() => {
    loadTimeSlots();
  }, []);

  const loadTimeSlots = async () => {
    try {
      const q = query(collection(db, 'timetable'));
      const querySnapshot = await getDocs(q);
      const slots: TimeSlot[] = [];
      querySnapshot.forEach((doc) => {
        slots.push({ id: doc.id, ...doc.data() } as TimeSlot);
      });
      setTimeSlots(slots);
    } catch (error) {
      console.error('Error loading timetable:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCellClick = (day: string, time: string) => {
    setSelectedSlot({ day, time });
    setShowAddModal(true);
    setFormData({ subject: '', room: '' });
  };

  const handleAddSlot = async () => {
    if (!currentUser || !selectedSlot || !formData.subject || !formData.room) {
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
    } catch (error) {
      console.error('Error adding slot:', error);
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

  const getSlotForCell = (day: string, time: string) => {
    return timeSlots.find(
      (slot) => slot.day === day && slot.time === time && slot.teacherId === currentUser?.uid
    );
  };

  if (loading) {
    return <div className="loading">Loading timetable...</div>;
  }

  return (
    <div className="dashboard-container">
      <header className="dashboard-header">
        <h1>Teachers Timetable Dashboard</h1>
        <div className="header-actions">
          <span className="user-cpf">
            {userCPF ? `CPF: ${displayCPF(userCPF)}` : 'Usuário'}
          </span>
          <button onClick={logout} className="logout-button">
            Logout
          </button>
        </div>
      </header>

      <div className="timetable-container">
        <table className="timetable">
          <thead>
            <tr>
              <th>Time</th>
              {DAYS.map((day) => (
                <th key={day}>{day}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {TIME_SLOTS.map((time) => (
              <tr key={time}>
                <td className="time-cell">{time}</td>
                {DAYS.map((day) => {
                  const slot = getSlotForCell(day, time);
                  return (
                    <td
                      key={`${day}-${time}`}
                      className="timetable-cell"
                      onClick={() => handleCellClick(day, time)}
                    >
                      {slot ? (
                        <div className="slot-content">
                          <div className="slot-subject">{slot.subject}</div>
                          <div className="slot-room">Room: {slot.room}</div>
                          <button
                            className="delete-slot"
                            onClick={(e) => {
                              e.stopPropagation();
                              if (slot.id) handleDeleteSlot(slot.id);
                            }}
                          >
                            ×
                          </button>
                        </div>
                      ) : (
                        <div className="empty-slot">+ Add</div>
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showAddModal && (
        <div className="modal-overlay" onClick={() => setShowAddModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h2>Add Time Slot</h2>
            <p>
              {selectedSlot?.day} - {selectedSlot?.time}
            </p>
            <div className="form-group">
              <label>Subject</label>
              <input
                type="text"
                value={formData.subject}
                onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                placeholder="Enter subject name"
              />
            </div>
            <div className="form-group">
              <label>Room</label>
              <input
                type="text"
                value={formData.room}
                onChange={(e) => setFormData({ ...formData, room: e.target.value })}
                placeholder="Enter room number"
              />
            </div>
            <div className="modal-actions">
              <button onClick={() => setShowAddModal(false)} className="cancel-button">
                Cancel
              </button>
              <button onClick={handleAddSlot} className="save-button">
                Save
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
