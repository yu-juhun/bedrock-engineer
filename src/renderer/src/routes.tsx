import { FiHome, FiFeather, FiSettings } from 'react-icons/fi'
import { LuCombine } from 'react-icons/lu'
import { HiOutlineChatAlt2 } from 'react-icons/hi'
import { FaAws } from 'react-icons/fa'
import HomePage from './pages/HomePage/HomePage'
import SettingPage from './pages/SettingPage/SettingPage'
import StepFunctionsGeneratorPage from './pages/StepFunctionsGeneratorPage/StepFunctionsGeneratorPage'
import WebsiteGeneratorPage from './pages/WebsiteGeneratorPage/WebsiteGeneratorPage'
import ChatPage from './pages/ChatPage/ChatPage'
import AwsDiagramGeneratorPage from './pages/AwsDiagramGeneratorPage/AwsDiagramGeneratorPage'

export const routes = [
  {
    name: 'Home',
    href: '/',
    icon: FiHome,
    position: 'top',
    element: <HomePage />
  },
  {
    name: 'Chat',
    href: '/chat',
    icon: HiOutlineChatAlt2,
    position: 'top',
    element: <ChatPage />
  },
  // {
  //   name: 'History',
  //   href: '/history',
  //   icon: FiBook,
  //   position: 'top'
  // },
  {
    name: 'Website Generator',
    href: '/generative-ui',
    icon: FiFeather,
    position: 'top',
    element: <WebsiteGeneratorPage />
  },
  {
    name: 'Step Functions Generator',
    href: '/step-functions-generator',
    icon: LuCombine,
    position: 'top',
    element: <StepFunctionsGeneratorPage />
  },
  {
    name: 'AWS Diagram Generator',
    href: '/aws-diagram-generator',
    icon: FaAws,
    position: 'top',
    element: <AwsDiagramGeneratorPage />
  },
  {
    name: 'Setting',
    href: '/setting',
    icon: FiSettings,
    position: 'top',
    element: <SettingPage />
  }
  // for debug
  // {
  //   name: 'Error',
  //   href: '/error',
  //   icon: FiSettings,
  //   position: 'top',
  //   element: <ErrorPage />
  // }
]
