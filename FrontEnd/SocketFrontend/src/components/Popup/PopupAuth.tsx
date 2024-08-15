import "./Authorization.css";
import { useState } from "react";

import { auth } from "../../firebase"

import { useFetch } from "../../CustomHooks";

import {
  signInWithEmailAndPassword,
} from "firebase/auth";

import { UserCredentialsObject } from "../../interfaces";

export default function PopupAuth() {
  const [userCredentials, setUserCredentials] = useState<UserCredentialsObject>({
    Email: "",
    Password: "",
    Username: "",
  });

  const Fetch = useFetch('http://localhost:3000');

  function handleCredentialChange(e: React.ChangeEvent<HTMLInputElement>) {
    setUserCredentials((x: UserCredentialsObject) => {
      return { ...x, [e.target.name]: e.target.value };
    });
  }

  function SignUpHandler(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    Fetch("SignUpInit", {
      Username: userCredentials.Username,
      Email: userCredentials.Email,
      Password: userCredentials.Password
    }).then(()=>{
      signInWithEmailAndPassword(auth, userCredentials.Email, userCredentials.Password)
    }).catch((err) => {
      console.log(err);
    });

  }

  function LoginHandler(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    signInWithEmailAndPassword(
      auth,
      userCredentials.Email,
      userCredentials.Password
    ).catch((err) => {
      console.log(err);
    });
  }

  const [LoginScreen, SetLoginScreen] = useState<boolean>(true);

  function ToggleLogin() {
    SetLoginScreen((x) => !x);
  }

  function LoginPopup() {
    return (
      <div className="PopupLoginContainer">
        <div className="PopupLoginHeader">
          <h1>Login</h1>
          <button onClick={ToggleLogin}>Signup</button>
        </div>
        <form onSubmit={LoginHandler}>
          <input
            type="text"
            name="Email"
            placeholder="Email"
            value={userCredentials.Email}
            onChange={handleCredentialChange}
          />
          <br />
          <input
            type="password"
            name="Password"
            placeholder="Password"
            value={userCredentials.Password}
            onChange={handleCredentialChange}
          />
          <br />
          <button>Login</button>
        </form>
      </div>
    );
  }

  function SignupPopup() {
    return (
      <div className="PopupSignupContainer">
        <div className="PopupSignupHeader">
          <h1>Signup</h1>
          <button onClick={ToggleLogin}>Login</button>
        </div>
        <form onSubmit={SignUpHandler}>
          <input
            type="text"
            placeholder="Email"
            name="Email"
            value={userCredentials.Email}
            onChange={handleCredentialChange}
          />
          <br />
          <input
            type="text"
            placeholder="Username"
            name="Username"
            value={userCredentials.Username}
            onChange={handleCredentialChange}
          />
          <br />
          <input
            type="password"
            placeholder="Password"
            name="Password"
            value={userCredentials.Password}
            onChange={handleCredentialChange}
          />
          <br />
          <button>Signup</button>
        </form>
      </div>
    );
  }

  return (
    <div className="PopupAuth">
      {LoginScreen ? LoginPopup() : SignupPopup()}
    </div>
  );
}
