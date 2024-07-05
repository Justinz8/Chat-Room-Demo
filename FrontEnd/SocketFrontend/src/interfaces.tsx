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
    message: string,
    timestamp: number,
    uid: string
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