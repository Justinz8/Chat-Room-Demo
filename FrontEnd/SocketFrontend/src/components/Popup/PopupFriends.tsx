import "./Friends.css";

import Popup from "reactjs-popup";

import UserActionPopup from "./UserActionPopup";

import { User } from "../../interfaces";

import React, { useState, useContext, useEffect } from "react";

import { useSocket, useLoadedUserGetter } from "../../CustomHooks";

import {
    getFriendReqContext,
    getFriendsContext,
} from "../../GlobalContextProvider";

export default function PopupFriends() {
    const [FriendEmail, SetFriendEmail] = useState("");

    const { FriendRequests } = useContext(getFriendReqContext());
    const { Friends } = useContext(getFriendsContext());
    const { getLoadedUser } = useLoadedUserGetter();

    const socket = useSocket();

    function addFriend(FriendEmail: string) {
        if (socket) {
            socket.emit("AddFriend", { FriendEmail: FriendEmail });
        }
    }

    function onFriendSubmit(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault();
        addFriend(FriendEmail);
    }

    function AcceptFriendReq(CurrentFriendReq: string) {
        if (socket) {
            socket.emit("AcceptFriendReq", CurrentFriendReq);
        }
    }

    const [PopupRender, SetPopupRender] = useState<string>("");

    function FriendReqs() {
        const styledRequests = FriendRequests.map((x: User) => (
            <div className="AddFriend-Request">
                <h3>{x.Username}</h3>
                <button
                    onClick={() => {
                        AcceptFriendReq(x.uid);
                    }}
                >
                    Accept
                </button>
                <button
                    onClick={() => {
                        AcceptFriendReq(x.uid);
                    }}
                >
                    Decline
                </button>
            </div>
        ));

        return (
            <>
                <h3>Add Friend</h3>
                <form onSubmit={onFriendSubmit} className="AddFriend-Form">
                    <input
                        type="text"
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                            SetFriendEmail(e.target.value)
                        }
                        value={FriendEmail}
                    />
                    <button>Add Friend</button>
                </form>
                <h3>Friend Requests</h3>
                {styledRequests}
            </>
        );
    }

    function FriendsList() {
        const [styledFriends, SetStyledFriends] = useState<JSX.Element[]>([]);

        useEffect(() => {
            Promise.all(
                Array.from(Friends).map((x) => {
                    return getLoadedUser(x).then((user) => {
                        const Username =
                            typeof user === "string" ? x : user.User.Username;

                        const Status =
                            typeof user === "string" ? -1 : user.Status;

                        return (
                            <Popup
                                trigger={
                                    <li className="PopupFriends-Friend">
                                        <img
                                            className="PopupFriends-PFP"
                                            src={user.UserPFP}
                                            onError={(ev) => {
                                                ev.currentTarget.src =
                                                    "https://picsum.photos/50";
                                            }}
                                        ></img>
                                        <span className="PopupFriends-Username">
                                            <p>{Username}</p>
                                        </span>
                                        <div
                                            className="PopupFriends-UserStatus"
                                            style={{
                                                backgroundColor: Status
                                                    ? "green"
                                                    : "gray",
                                            }}
                                        />
                                    </li>
                                }
                                position={["right top", "right bottom"]}
                            >
                                <UserActionPopup
                                    uid={
                                        typeof user === "string"
                                            ? x
                                            : user.User.uid
                                    }
                                    chatOptions={false}
                                />
                            </Popup>
                        );
                    });
                })
            ).then((val) => {
                SetStyledFriends(val);
            });
        }, []);

        return (
            <>
                <h3>Friends</h3>
                <ul>{styledFriends}</ul>
            </>
        );
    }

    function renderedPopup() {
        switch (PopupRender) {
            case "FriendReqs": {
                return FriendReqs();
            }
            case "Friends": {
                return <FriendsList />;
            }
            default: {
                return null;
            }
        }
    }

    return (
        <div>
            <Popup
                trigger={<button className="Sidebar-Button">Friends</button>}
            >
                <div className="FriendsPopUp">
                    <header>
                        <button
                            style={{
                                borderRight: "1px solid var(--accent-color2)",
                            }}
                            className="Friends-Button"
                            onClick={() => {
                                SetPopupRender("FriendReqs");
                            }}
                        >
                            Friend Reqs
                        </button>
                        <button
                            style={{
                                borderLeft: "1px solid var(--accent-color2)",
                            }}
                            className="Friends-Button"
                            onClick={() => {
                                SetPopupRender("Friends");
                            }}
                        >
                            Friends
                        </button>
                    </header>
                    <div className="Friends-Main">{renderedPopup()}</div>
                </div>
            </Popup>
        </div>
    );
}
