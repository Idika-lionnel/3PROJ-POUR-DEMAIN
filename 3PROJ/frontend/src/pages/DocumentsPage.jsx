import React from 'react';
import Sidebar from '../components/Sidebar';

const DocumentsPage = () => {
  return (
    <div className="flex h-screen w-screen overflow-hidden bg-gray-100 dark:bg-black text-black dark:text-white">
      <Sidebar />
      <div className="flex-1 p-8 overflow-y-auto pl-[80px]">
        <h1 className="text-2xl font-bold mb-4">Mes documents</h1>
        <p>Ici vous pouvez voir ou téléverser vos documents.</p>
        {/* Tu peux ici ajouter une liste de fichiers ou un uploader */}
      </div>
    </div>
  );
};

export default DocumentsPage;