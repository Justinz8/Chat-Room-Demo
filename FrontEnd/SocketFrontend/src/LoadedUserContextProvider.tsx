import { createContext, useState, useMemo } from "react";
import { KnownUser } from "./interfaces";

interface LoadedUserContextType{
    LoadedUsers: Map<string, KnownUser>,
    SetLoadedUsers: React.Dispatch<React.SetStateAction<Map<string, KnownUser>>>
}
const LoadedUserContext = createContext<LoadedUserContextType | null>(null);

interface props{
    children: React.ReactElement[] | React.ReactElement
}

export function LoadedUserProvider(props: props){
    /*
        A loaded user is a user that has its uid associated with its username and 
        online status stored
    */

    const [LoadedUsers, SetLoadedUsers] = useState<Map<string, KnownUser>>(new Map<string, KnownUser>());

    const LoadedUserValue = useMemo(()=>{
        return {
            LoadedUsers,
            SetLoadedUsers
        }
    }, [LoadedUsers])

    return <LoadedUserContext.Provider value={LoadedUserValue}>
        {props.children}
    </LoadedUserContext.Provider>
}

export function getLoadedUserContext(){
    return LoadedUserContext as React.Context<LoadedUserContextType>
}