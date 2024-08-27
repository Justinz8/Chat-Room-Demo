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
        return { img: `data:image/${type};base64,${Buffer.from(content[0]).toString("base64")}` };
    })
}

function getPFP(uid: string, bucket: Bucket) {
    return getImage('UserIcons', uid, 'jpg', bucket).catch(err => {
        return undefined
    })
}

exports.getUsernames = getUsernames

exports.getImage = getImage

exports.getPFP = getPFP