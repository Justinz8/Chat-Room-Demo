import { Socket, io } from "socket.io-client";
import { useState, useEffect } from "react";
import { auth } from "./firebase";

let sharedSocket: Socket | null = null;

export function useSocket(){
    const [Socket, SetSocket] = useState<Socket | null>(null);

    useEffect(()=>{
        auth.onIdTokenChanged(()=>{
            if(auth.currentUser){
                auth.currentUser?.getIdToken().then((token: string) => {
                    if(sharedSocket && token === (sharedSocket?.auth as { [key: string]: any })["token"]) return;
                    sharedSocket = io("http://localhost:3000", {
                        auth:{
                            token: token,
                        }
                    })
                }).then(() => {
                    SetSocket(sharedSocket);
                })
            }else{
                if(sharedSocket){
                    sharedSocket.disconnect();
                }
                SetSocket(null);
            }
        })
    }, [])

    return Socket;
}

export function useFetch(url: string){
    return (urlEnd: string, body?: any) => {
        if(!auth.currentUser){
            return fetch(`${url}/${urlEnd}`, {
                method: "POST",
                headers: {
                "Content-Type": "application/json",
                },
                body: JSON.stringify(body ? {...body}: {}),
            })
        }
        return auth.currentUser.getIdToken().then((token) => {
            return fetch(`${url}/${urlEnd}`, {
                method: "POST",
                headers: {
                "Content-Type": "application/json",
                },
                body: JSON.stringify(body ? {
                ...body,
                token: token,
                }: {
                    token: token
                }),
            })
        }).then((response) => response.json())
    }
}