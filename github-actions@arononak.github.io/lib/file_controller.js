import GLib from 'gi://GLib'
import Gio from 'gi://Gio'

export class FileController {
    static extensionDir() {
        return GLib.build_filenamev([GLib.get_user_data_dir(), `github-actions-gnome-extension`])
    }

    static writeFile(filename, content) {
        const dir = Gio.File.new_for_path(this.extensionDir())
        if (!dir.query_exists(null)) {
            try {
                dir.make_directory_with_parents(null)
            } catch (e) {
                log(e.message)
            }
        }

        try {
            GLib.file_set_contents(`${this.extensionDir()}/${filename}`, content)
        } catch (e) {
            log(e.message)
        }
    }

    static readFile(filename) {
        try {
            const [success, content] = GLib.file_get_contents(`${this.extensionDir()}/${filename}`)


            if (success) {
                const decoder = new TextDecoder(`utf-8`)
                return decoder.decode(content)
            }

            return null
        } catch (e) {
            return null
        }
    }
}
