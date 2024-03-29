import { Burger } from '@mantine/core';
import { IconPlus } from '@tabler/icons-react';
import { deleteCookie } from 'cookies-next';
import { signOut, useSession } from 'next-auth/react';
import { useContext } from 'react';

import { AppContext } from '~/providers/appcontext';
import { type ThemeState, useAuthorizedUserStore, useThemeStore } from '~/store/store';
import openGlobalModal from '~/utils/modal';

import ThemeSwitcher from './switchtheme';
import TaskForm from './taskform';

const MobileNavbar = () => {
	const { data: sessionData } = useSession();
	const currentTheme = useThemeStore((state: ThemeState) => state.theme);

	const handleSignOut = async () => {
		await signOut();
		useAuthorizedUserStore.setState({ isAuthorized: false });
		deleteCookie('sessionToken');
	};

	const openNewTaskModal = () => {
		openGlobalModal('addTaskModal', 'Add new item', <TaskForm></TaskForm>, currentTheme);
	};

	const { sidebarVisible, toggleSidebar } = useContext(AppContext);
	const label = sidebarVisible ? 'Close navigation' : 'Open navigation';

	return (
		<div
			className={`fixed z-50 flex items-center justify-center gap-1 p-4 transition duration-200 ${
				sessionData
					? 'bottom-0 left-0 right-0 gap-2 bg-white shadow-main dark:bg-[#1d1f20]'
					: 'bottom-0 right-0'
			}`}
		>
			<div className="flex h-12 items-center justify-center rounded-lg border-2 border-[#ecf0f3] bg-[#ecf0f3] p-2 text-sm text-[#030910] transition duration-200 dark:border-[#2b3031] dark:bg-[#17181c] dark:text-white ">
				<Burger
					opened={sidebarVisible}
					onClick={toggleSidebar}
					aria-label={label}
					color={currentTheme === 'dark' ? 'white' : '#030910'}
					className="transition duration-200"
				/>
			</div>
			{sessionData && (
				<button
					onClick={openNewTaskModal}
					className="flex h-12 w-full items-center justify-center rounded-lg border-2 border-[#ecf0f3] bg-[#ecf0f3] p-2 text-sm text-[#030910] transition duration-200 dark:border-[#2b3031] dark:bg-[#17181c] dark:text-white "
				>
					<IconPlus size="1.5rem" />
				</button>
			)}
			<div className="flex h-12 items-center rounded-lg border-2 border-[#eeedf0] bg-white pl-4 font-semibold text-[#02080f] transition duration-200 dark:border-[#2b3031] dark:bg-[#17181c] dark:text-white">
				<ThemeSwitcher size="h-[26px] w-[52px]" />
			</div>
			<button
				className="h-12 rounded-lg border-2 bg-red-500 px-3 font-semibold text-white no-underline transition duration-200 dark:border-[#1d1f20]"
				onClick={() => void handleSignOut()}
			>
				<svg
					xmlns="http://www.w3.org/2000/svg"
					viewBox="0 0 512 512"
					className="w-5 fill-white"
				>
					<path d="M96 480h64C177.7 480 192 465.7 192 448S177.7 416 160 416H96c-17.67 0-32-14.33-32-32V128c0-17.67 14.33-32 32-32h64C177.7 96 192 81.67 192 64S177.7 32 160 32H96C42.98 32 0 74.98 0 128v256C0 437 42.98 480 96 480zM504.8 238.5l-144.1-136c-6.975-6.578-17.2-8.375-26-4.594c-8.803 3.797-14.51 12.47-14.51 22.05l-.0918 72l-128-.001c-17.69 0-32.02 14.33-32.02 32v64c0 17.67 14.34 32 32.02 32l128 .001l.0918 71.1c0 9.578 5.707 18.25 14.51 22.05c8.803 3.781 19.03 1.984 26-4.594l144.1-136C514.4 264.4 514.4 247.6 504.8 238.5z" />
				</svg>
			</button>
		</div>
	);
};

export default MobileNavbar;
