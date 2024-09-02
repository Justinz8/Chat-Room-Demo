import "./UsersBar.css";

import { useContext, useEffect, useState } from "react";

import Popup from "reactjs-popup";
import UserActionPopup from "../Popup/UserActionPopup";

import { getChatContext } from "../../GlobalContextProvider";

import { useLoadedUserGetter } from "../../CustomHooks";

export default function UsersBar() {
    const { getLoadedUser } = useLoadedUserGetter();

    const { currentChat } = useContext(getChatContext());

    function Members() {
        /*
            Style each member in the chat such that it displays its Username and online status
            whilst also allowing the user to take action on a member when clicked on
          */

        const [styledMembers, SetStyledMembers] = useState<JSX.Element[]>([]);

        useEffect(() => {
            Promise.all(
                currentChat.members.map((x) => {
                    return getLoadedUser(x).then((user) => {
                        const Status =
                            typeof user === "string" ? -1 : user.Status;

                        const Username =
                            typeof user === "string" ? x : user.User.Username;
                        const uid =
                            typeof user === "string" ? x : user.User.uid;

                        return (
                            <Popup
                                key={x}
                                trigger={
                                    <div className="UsersBar-User">
                                        <img
                                            className="UsersBar-PFP"
                                            src={user.UserPFP}
                                            onError={(ev) => {
                                                ev.currentTarget.src =
                                                    "https://picsum.photos/50";
                                            }}
                                        ></img>
                                        <span className="UsersBar-Username">
                                            <p>{Username}</p>
                                        </span>
                                        <div
                                            className="UsersBar-UserStatus"
                                            style={{
                                                backgroundColor: Status
                                                    ? "green"
                                                    : "gray",
                                            }}
                                        />
                                    </div>
                                }
                                position={["left top", "left bottom"]}
                                keepTooltipInside="body"
                            >
                                <UserActionPopup uid={uid} chatOptions={true} />
                            </Popup>
                        );
                    });
                })
            ).then((val) => {
                SetStyledMembers(val);
            });
        }, []);
        return (
            <div className="UsersBar-Wrapper">
                <h2>Members</h2>
                {styledMembers}
            </div>
        );
    }

    return <>{currentChat.id && <Members />}</>;
}
