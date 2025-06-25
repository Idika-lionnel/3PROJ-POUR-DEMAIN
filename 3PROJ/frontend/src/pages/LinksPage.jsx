import React from 'react';
import Sidebar from '../components/Sidebar';

const LinksPage = () => {
  return (
    <div className="flex h-screen w-screen overflow-hidden bg-gray-100 dark:bg-black text-black dark:text-white">
      <Sidebar />
      <div className="flex-1 p-8 overflow-y-auto pl-[80px]">
        <h1 className="text-2xl font-bold mb-4">Mes liens utiles</h1>
        <p>Liste de liens importants que vous pouvez consulter ici.</p>
        {/* Exemple de liens */}
        <ul className="mt-4 space-y-2 list-disc pl-6">
          <li><a href="https://www.supchat.com/docs" className="text-blue-600 dark:text-blue-400 hover:underline">Documentation Supchat</a></li>
          <li><a href="https://www.github.com" className="text-blue-600 dark:text-blue-400 hover:underline">GitHub</a></li>
        </ul>
      </div>
    </div>
  );
};

export default LinksPage;