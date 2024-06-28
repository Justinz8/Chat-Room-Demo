import { io } from "socket.io-client";
import { auth } from "./firebase";
import { onAuthStateChanged } from "firebase/auth";

import { useEffect, useState } from "react";
import Sidebar from "./components/SideBarComponents/Sidebar";

import samplechats from "./samplechats.json";

import PopupAuth from "./components/Popup/PopupAuth";

import ChatWindow from "./components/ChatArea/ChatWindow";

import "./App.css";

function App() {
  const [token, setToken] = useState<string>("");
  const [loggedIn, setLoggedIn] = useState<number>(0);

  const [FriendRequests, SetFriendRequests] = useState<any[]>([]);

  useEffect(() => {
    onAuthStateChanged(auth, (user) => {
      if (user) {
        user.getIdToken().then((token) => {
          setToken(token);

          //initial api calls go here
          fetch("http://localhost:3000/getFriendRequests", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ token: token }),
          })
            .then((response) => response.json())
            .then((data) => {
              SetFriendRequests(data.requests);
            });
        });
        setLoggedIn(1);
      } else {
        setLoggedIn(-1);
        setToken("");
      }
    });
  }, []);

  async function getToken() {
    const curtoken = await auth.currentUser?.getIdToken();
    if (curtoken === undefined) return "";

    setToken(curtoken);
    return curtoken;
  }

  function TestAddChat() {
    getToken().then((token) => {
      fetch("http://localhost:3000/addChat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          chat: {
            name: "Test Chat",
            members: ["Test User"],
          },
          token: token,
        }),
      }).then((response) => {
        console.log(response);
      });
    });
  }

  const [currentChatID, setCurrentChatID] = useState<string>("");

  const [socket, SetSocket] = useState<any>(null);

  useEffect(() => {
    if (socket) {
      socket.close();
    }
    const newSocket = io("http://localhost:3000", {
      auth: {
        token: token,
      },
    });

    SetSocket(newSocket);

    return () => {
      newSocket.close();
    };
  }, [token]);

  useEffect(() => {
    if (socket) {
      socket.on("connect_error", (err: any) => {
        console.error(err);
      });

      socket.on("connected", () => {
        if (currentChatID) {
          socket.emit("joinRoom", currentChatID);
        }
      });

      socket.on("FriendRequest", (User: any) => {
        console.log(User);
      });
    }
  }, [socket]);

  function addFriend(FriendEmail: string) {
    if (socket) {
      socket.emit("AddFriend", { FriendEmail: FriendEmail });
    }
  }

  function setCurrentChat(ID: string) {
    if (currentChatID === ID) return;
    socket.emit("leaveRoom", currentChatID);
    socket.emit("joinRoom", ID);
    setCurrentChatID(ID);
  }

  function loadFunction() {
    if (loggedIn === 1) {
      return (
        <>
          <Sidebar
            auth={auth}
            TestAddChat={TestAddChat}
            setCurrentChat={setCurrentChat}
            addFriend={addFriend}
            FriendRequests={FriendRequests}
          />
          <ChatWindow
            currentChatID={currentChatID}
            getToken={getToken}
            socket={socket}
          />
        </>
      );
    } else if (loggedIn === -1) {
      return <PopupAuth auth={auth} />;
    }
  }

  return <div className="Main-Wrapper">{loadFunction()}</div>;
}

export default App;
