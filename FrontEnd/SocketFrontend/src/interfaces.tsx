import { Socket } from "socket.io-client"


export interface User{
    uid: string,
    Username: string
}

export interface KnownUser{
    User: User,
    Status: number //1 is online, 0 is offline
}

export interface SocketProviderContext{
    socket: Socket,
    SetSocket: (value: Socket) => void
}

export interface Message{
    message?: string,
    added?: User,
    removed?: User,
    timestamp: number,
    sender: User,
    type: number
}

export interface Chat{
    name: string,
    id: string,
    owner: string,
    members: string[]
}

export interface UserCredentialsObject{
    Email: string, 
    Password: string, 
    Username: string
}