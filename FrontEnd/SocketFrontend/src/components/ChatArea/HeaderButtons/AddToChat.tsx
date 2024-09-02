import "./AddToChat.css";

import Popup from "reactjs-popup";

import { useState, useContext, useEffect } from "react";

import { useSocket } from "../../../CustomHooks";

import {
    getChatContext,
    getFriendsContext,
} from "../../../GlobalContextProvider";

import { useLoadedUserGetter } from "../../../CustomHooks";

export default function AddToChat() {
    const { getLoadedUser } = useLoadedUserGetter();

    const [AddToChat, SetAddToChat] = useState<string>("");
    const { currentChat } = useContext(getChatContext());
    const { Friends } = useContext(getFriendsContext());

    const socket = useSocket();

    const [AddToChatUserOptions, SetAddToChatUserOptions] = useState<
        JSX.Element[]
    >([]);

    useEffect(() => {
        Promise.all(
            Array.from(Friends).map((x: string) => {
                return getLoadedUser(x).then((user) => {
                    const Username =
                        typeof user === "string" ? x : user.User.Username;

                    return (
                        <option key={user.User.uid} value={x}>
                            {Username}
                        </option>
                    );
                });
            })
        ).then((val) => {
            SetAddToChatUserOptions(val);
        });
    }, []);

    function HandleAddUserSubmit(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault();

        if (socket) {
            socket.emit("AddUserToChat", {
                Frienduid: AddToChat,
                Chatid: currentChat.id,
            });
        }
    }

    function AddToChatChangeHandler(e: React.ChangeEvent<HTMLSelectElement>) {
        SetAddToChat(e.target.value);
    }

    return (
        <div className="AddToChat-Body">
            <Popup
                trigger={
                    <button className="ChatHeader-Button AddToChat-Toggle"></button>
                }
            >
                <div className="AddToChat-Toggle-Body">
                    <h3>Add Friend to chat</h3>
                    <form onSubmit={HandleAddUserSubmit}>
                        <select
                            value={AddToChat}
                            onChange={AddToChatChangeHandler}
                        >
                            <option></option>
                            {AddToChatUserOptions}
                        </select>
                        <button type="submit">SUBMIT</button>
                    </form>
                </div>
            </Popup>
        </div>
    );
}
