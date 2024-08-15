//returns a promise where given a list of UserIDs returns a list of objects that contains both the original 
//userIDs and their respective usernames
exports.getUsernames = function getUsernames(UserIDs:string[], userDataRef){
    return Promise.all(UserIDs.map(x => {
        return userDataRef.doc(x).get().then(user => {
            if (!user.data()) {
                return {
                    uid: x,
                    Username: x
                };
            } else {
                return {
                    uid: x,
                    Username: user.data().Username 
                };
            }
        })
    }))
}