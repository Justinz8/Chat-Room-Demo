import "./Authorization.css";
import { useState } from "react";

import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
} from "firebase/auth";

export default function PopupAuth(props: any) {
  const [userCredentials, setUserCredentials] = useState<any>({
    Email: "",
    Password: "",
    Username: "",
  });

  function handleCredentialChange(e: React.ChangeEvent<HTMLInputElement>) {
    setUserCredentials((x: any) => {
      return { ...x, [e.target.name]: e.target.value };
    });
  }

  function SignUpHandler(e: any) {
    e.preventDefault();

    createUserWithEmailAndPassword(
      props.auth,
      userCredentials.Email,
      userCredentials.Password
    )
      .then(async (userCredential) => {
        // Signed in
        const user = userCredential.user;
        console.log(user);
        // ...

        fetch("http://localhost:3000/SignUpInit", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            token: await user.getIdToken(),
            email: user.email,
            username: userCredentials.Username,
          }),
        });
      })
      .catch((error) => {
        const errorCode = error;
        const errorMessage = error.message;
        console.log(errorCode, errorMessage);
      });
  }

  function LoginHandler(e: any) {
    e.preventDefault();

    signInWithEmailAndPassword(
      props.auth,
      e.target.Email.value,
      e.target.Password.value
    ).catch((error) => {
      const errorCode = error;
      const errorMessage = error.message;
      console.log(errorCode, errorMessage);
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
