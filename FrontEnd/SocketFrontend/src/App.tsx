import { auth } from "./firebase";
import { onAuthStateChanged } from "firebase/auth";

import { useEffect, useState, useContext } from "react";

import Sidebar from "./components/SideBarComponents/Sidebar";
import PopupAuth from "./components/Popup/PopupAuth";
import ChatWindow from "./components/ChatArea/ChatWindow";

import { User } from "./interfaces";

import { useSocket, useFetch } from "./CustomHooks";

import "./App.css";

import { getChatIDContext, getFriendsContext } from "./GlobalContextProvider";

function App() {
  const [loggedIn, setLoggedIn] = useState<number>(0);

  const [FriendRequests, SetFriendRequests] = useState<User[]>([]);

  const [, SetFriends] = useContext(getFriendsContext());

  const Fetch = useFetch('http://localhost:3000');

  useEffect(() => {
    onAuthStateChanged(auth, (user) => {
      if (user) {
        Fetch('getUserData').then((data) => {
          console.log(data)
          SetFriendRequests(data.requests);
          SetFriends(data.friends);
        });
        setLoggedIn(1);
      } else {
        setLoggedIn(-1);
      }
    });
  }, []);

  const [currentChatID, setCurrentChatID] = useContext(getChatIDContext());

  const socket = useSocket();
  
  useEffect(() => {
    if (socket) {
      socket.on("connect_error", (err: Error) => {
        console.error(err);
      });

      socket.on("connected", () => {
        if (currentChatID) {
          socket.emit("joinRoom", currentChatID);
        }
      });

      socket.on("FriendRequest", (User: User) => {
        SetFriendRequests((x: User[]) => [...x, User])
      });
    }
  }, [socket]);



  function setCurrentChat(ID: string) {
    if (currentChatID === ID) return;
    if(socket){
      socket.emit("leaveRoom", currentChatID);
      socket.emit("joinRoom", ID);
    }
    setCurrentChatID(ID);
  }


  function loadFunction() {
    if (loggedIn === 1) {
      return (
        <>
          <Sidebar
            setCurrentChat={setCurrentChat}
            FriendRequests={FriendRequests}
          />
          <ChatWindow/>
        </>
      );
    } else if (loggedIn === -1) {
      return <PopupAuth/>;
    }
  }

  return <div className="Main-Wrapper">{loadFunction()}</div>
}


export default App;
