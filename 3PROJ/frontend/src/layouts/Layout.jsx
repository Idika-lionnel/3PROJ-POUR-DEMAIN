import React from 'react';
import Sidebar from '../components/Sidebar';
import { Outlet } from 'react-router-dom';

const Layout = () => (
    <div className="flex h-screen w-screen overflow-hidden">
        <Sidebar />
        <main className="w-full ml-[0px] h-full overflow-auto bg-white dark:bg-[#0f172a]">
            <Outlet />
        </main>
    </div>
);

export default Layout;
