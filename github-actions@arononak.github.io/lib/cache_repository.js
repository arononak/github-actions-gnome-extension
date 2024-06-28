import { FileController } from './file_controller.js'

export class CacheRepository {
    static fetchUser(login) {
        const fileContent = FileController.readFile(login)

        if (fileContent == null) {
            return null
        }

        return JSON.parse(fileContent)
    }

    static updateUser(login, userObject) {
        FileController.writeFile(login, JSON.stringify(userObject))
    }

    static fetchRepo(owner, repo) {
        const fileContent = FileController.readFile(`${owner}_${repo}`)

        if (fileContent == null) {
            return null
        }

        return JSON.parse(fileContent)
    }

    static updateRepo(owner, repo, repoObject) {
        FileController.writeFile(`${owner}_${repo}`, JSON.stringify(repoObject))
    }
}
