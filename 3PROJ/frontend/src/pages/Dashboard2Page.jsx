import React, { useEffect, useState } from 'react';
import useAuthStore from '../store/authStore';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import Layout from '../components/Layout';

const Dashboard2 = () => {
  const user = useAuthStore((state) => state.user);
  const token = useAuthStore((state) => state.token);
  const navigate = useNavigate();

  const [tasks, setTasks] = useState([
    
  ]);
  const [newTask, setNewTask] = useState('');
  const [workspaces, setWorkspaces] = useState([]);

  useEffect(() => {
    const fetchWorkspaces = async () => {
      try {
        const res = await axios.get('http://localhost:5050/api/workspaces', {
          headers: { Authorization: `Bearer ${token}` },
        });
        setWorkspaces(res.data);
      } catch (err) {
        console.error('Erreur chargement workspaces :', err);
      }
    };
    if (token) fetchWorkspaces();
  }, [token]);

  const handleAddTask = () => {
    if (!newTask.trim()) return;
    const task = { id: Date.now(), label: newTask, done: false };
    setTasks([...tasks, task]);
    setNewTask('');
  };

  const toggleTask = (id) => {
    setTasks(tasks.map((t) => (t.id === id ? { ...t, done: !t.done } : t)));
  };

  const removeTask = (id) => {
    setTasks(tasks.filter((t) => t.id !== id));
  };

  return (
    <Layout>
      <div className="grid grid-cols-3 gap-6 w-full pl-[70px]">
        {/* Profil */}
        <div className="col-span-1 bg-white dark:bg-[#1e293b] p-4 rounded-xl shadow text-black dark:text-white">
          <h2 className="font-semibold text-lg text-gray-800 dark:text-white">
            {user.prenom} {user.nom}
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-300">{user.role}</p>
          <button
            onClick={() => navigate('/documents')}
            className="mt-4 w-full bg-[#0F71D3] text-white py-2 rounded hover:bg-blue-700 dark:bg-[#0A3A66]"
          >
            Mes documents
          </button>
          <button
              onClick={() => navigate('/mentions')}
            className="mt-2 w-full bg-[#0F71D3] text-white py-2 rounded hover:bg-blue-700 dark:bg-[#0A3A66]"
          >
            Mentions
          </button>
        </div>

        {/* To-do List */}
        <div className="col-span-1 bg-white dark:bg-[#1e293b] p-4 rounded-xl shadow text-black dark:text-white">
          <h2 className="text-lg font-semibold text-gray-800 dark:text-white mb-4">To do List</h2>
          <ul className="space-y-2">
            {tasks.map((task) => (
              <li key={task.id} className="flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={task.done}
                    onChange={() => toggleTask(task.id)}
                  />
                  <span
                    className={`${
                      task.done ? 'line-through text-gray-400' : 'text-black dark:text-white'
                    }`}
                  >
                    {task.label}
                  </span>
                </div>
                <button
                  onClick={() => removeTask(task.id)}
                  className="text-red-500 hover:text-red-700"
                >
                  🗑️
                </button>
              </li>
            ))}
          </ul>
          <div className="mt-4 flex">
            <input
              type="text"
              className="flex-1 p-2 border dark:border-gray-700 rounded-l bg-white dark:bg-gray-800 dark:text-white"
              placeholder="Nouvelle tâche..."
              value={newTask}
              onChange={(e) => setNewTask(e.target.value)}
            />
            <button onClick={handleAddTask} className="bg-[#0F71D3] text-white px-4 rounded-r dark:bg-[#0A3A66]">
              +
            </button>
          </div>
        </div>

        {/* Workspaces */}
        <div className="col-span-1 bg-white dark:bg-[#1e293b] p-4 rounded-xl shadow text-black dark:text-white">
          <h2 className="text-lg font-semibold text-center mb-4">My workspaces</h2>
          <div className="space-y-4 ">
            {workspaces.length === 0 ? (
              <p className="text-center text-gray-500 dark:text-gray-300">
                Aucun espace trouvé.
              </p>
            ) : (
              workspaces.map((ws) => (
                <div
                  key={ws._id}
                  onClick={() => navigate(`/workspaces/${ws._id}/channels`)}

                   className="bg-[#0F71D3] py-6 text-center rounded-xl text-white font-semibold cursor-pointer hover:bg-blue-600 transition dark:bg-[#0A3A66]"
                >
                  {ws.name}
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default Dashboard2;