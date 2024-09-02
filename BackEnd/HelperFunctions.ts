import { Bucket } from '@google-cloud/storage'

//returns a promise where given a list of UserIDs returns a list of objects that contains both the original 
//userIDs and their respective usernames
function getUsernames(UserIDs: string[], userDataRef) {
    return Promise.all(UserIDs.map(x => {
        return Promise.all([userDataRef.doc(x).get()]).then(([user]) => {
            if (!user.data()) {
                return {
                    uid: x,
                    Username: x,
                };
            } else {
                return {
                    uid: x,
                    Username: user.data().Username,
                };
            }
        })
    }))
}

function getImage(prefix: string, name: string, type: string, bucket: Bucket) {
    return bucket.file(`${prefix}/${name}.${type}`).download().then((content) => {
        return `data:image/${type};base64,${Buffer.from(content[0]).toString("base64")}`
    })
}

function getPFP(uid: string, bucket: Bucket):Promise<string> {
    return getImage('UserIcons', uid, 'jpg', bucket).catch(err => {
        return ""
    })
}

//given an array of uid's, get the PFP of each uid and create a map where key: uid, value: img
function getPFPMap(members: string[], bucket){
    const imgMap = new Map<string, string>()

    return Promise.all(//Promise array to get userPFP of each uid and storing it in a map
        members.map(uid => {
            if(imgMap.has(uid)) return //if already got image of a uid just skip
            return getPFP(uid, bucket).then((img) => {
                imgMap.set(uid, img)
            })
        }
    )).then(() => {
        return imgMap
    })
}

export { getUsernames, getImage, getPFP, getPFPMap }