import Sidebar from './Sidebar';

const Layout = ({ children }) => {
  return (
    <div className="flex h-screen w-screen overflow-hidden">
      <Sidebar />
      <div className="flex-1 p-6 overflow-y-auto bg-gray-100 dark:bg-black text-black dark:text-white">
        {children}
      </div>
    </div>
  );
};

export default Layout;