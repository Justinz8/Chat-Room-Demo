import { Socket } from "socket.io-client"


export interface User{
    uid: string,
    Username: string
}

export interface SocketProviderContext{
    socket: Socket,
    SetSocket: (value: Socket) => void
}

export interface Message{
    message?: string,
    added?: User,
    timestamp: number,
    sender: User,
    type: number
}

export interface Chat{
    name: string,
    id: string,
    members: User[]
}

export interface UserCredentialsObject{
    Email: string, 
    Password: string, 
    Username: string
}