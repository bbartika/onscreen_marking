import path from 'path';
import fs from 'fs-extra';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const rootFolder = path.join(__dirname, '..', '..', process.env.BASE_DIR);

// Ensure the root folder exists
fs.ensureDirSync(rootFolder);

export const listFiles = (req, res) => {
    const { action, path: relativePath, name: newName } = req.body;

    const folderPath = path.join(rootFolder, relativePath || '/');

    if (!fs.existsSync(rootFolder)) {
        fs.mkdirSync(rootFolder, { recursive: true });
    } else {
    }

    if (action === 'read') {
        // Read files logic
        fs.readdir(folderPath, { withFileTypes: true }, (err, items) => {
            if (err) {
                return res.status(500).json({ error: err.message });
            }

            const files = items.map((item) => {
                const filePath = path.join(folderPath, item.name);
                const stats = fs.statSync(filePath);

                return {
                    path: null,
                    action: null,
                    newName: null,
                    names: null,
                    name: item.name,
                    size: item.isDirectory() ? 0 : stats.size,
                    previousName: null,
                    dateModified: stats.mtime,
                    dateCreated: stats.birthtime,
                    hasChild: item.isDirectory(),
                    isFile: !item.isDirectory(),
                    type: '',
                    id: null,
                    filterPath: '\\',
                    filterId: null,
                    parentId: null,
                    targetPath: null,
                    renameFiles: null,
                    uploadFiles: null,
                    caseSensitive: false,
                    searchString: null,
                    showHiddenItems: false,
                    showFileExtension: false,
                    data: null,
                    targetData: null,
                    permission: null,
                };
            });

            res.json({
                cwd: {
                    path: null,
                    action: null,
                    newName: null,
                    names: null,
                    name: path.basename(folderPath) || 'Scan Data',
                    size: 0,
                    previousName: null,
                    dateModified: new Date(),
                    dateCreated: new Date(),
                    hasChild: true,
                    isFile: false,
                    type: '',
                    id: null,
                    filterPath: '',
                    filterId: null,
                    parentId: null,
                    targetPath: null,
                    renameFiles: null,
                    uploadFiles: null,
                    caseSensitive: false,
                    searchString: null,
                    showHiddenItems: false,
                    showFileExtension: false,
                    data: null,
                    targetData: null,
                    permission: null,
                },
                files,
                error: null,
                details: null,
            });
        });
    } else if (action === 'create') {
        if (!newName) {
            return res.status(400).json({ error: 'New folder name is required for create action.' });
        }

        const newFolderPath = path.join(folderPath, newName);

        fs.mkdir(newFolderPath, { recursive: true }, (err) => {
            if (err) {
                return res.status(500).json({ error: err.message });
            }

            // Send the newly created folder back in the response
            const currentDate = new Date();

            res.json({
                cwd: {
                    path: null,
                    action: null,
                    newName: null,
                    names: null,
                    name: path.basename(folderPath) || 'Scan Data',
                    size: 0,
                    previousName: null,
                    dateModified: currentDate.toISOString(),
                    dateCreated: currentDate.toISOString(),
                    hasChild: true,
                    isFile: false,
                    type: '',
                    id: null,
                    filterPath: '',
                    filterId: null,
                    parentId: null,
                    targetPath: null,
                    renameFiles: null,
                    uploadFiles: null,
                    caseSensitive: false,
                    searchString: null,
                    showHiddenItems: false,
                    showFileExtension: false,
                    data: null,
                    targetData: null,
                    permission: null,
                },
                files: [
                    {
                        path: null,
                        action: null,
                        newName: null,
                        names: null,
                        name: newName,
                        size: 0,
                        previousName: null,
                        dateModified: currentDate.toISOString(),
                        dateCreated: currentDate.toISOString(),
                        hasChild: false,
                        isFile: false,
                        type: '',
                        id: null,
                        filterPath: '\\',
                        filterId: null,
                        parentId: null,
                        targetPath: null,
                        renameFiles: null,
                        uploadFiles: null,
                        caseSensitive: false,
                        searchString: null,
                        showHiddenItems: false,
                        showFileExtension: false,
                        data: null,
                        targetData: null,
                        permission: null,
                    },
                ],
                error: null,
                details: null,
            });
        });
    } else if (action === 'delete') {

        // Prevent deletion of the root folder
        if (folderPath === rootFolder || folderPath.startsWith(rootFolder + '/restricted')) {
            return res.status(400).json({ error: 'Cannot delete the root folder or restricted folders' });
        }

        // Perform delete logic
        fs.rm(folderPath, { recursive: true, force: true }, (err) => {
            if (err) {
                return res.status(500).json({ error: err.message });
            }

            // Respond after successful deletion
            res.json({
                cwd: null,
                files: [],
                error: null,
                details: null,
            });
        });
    } else {
        res.status(400).json({ error: 'Invalid action.' });
    }
};


export const uploadFile = (req, res) => {
    if (!req.file) {
        return res.status(400).json({ error: 'No file uploaded' });
    }
    res.json({ message: 'File uploaded successfully', file: req.file });
};

export const deleteFile = (req, res) => {
    const { name } = req.body;


    if (!name) {
        return res.status(400).json({ error: 'Invalid request' });
    }

    const targetPath = path.join(rootFolder, name);

    fs.remove(targetPath, (err) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }

        res.json({ message: 'File/Folder deleted successfully' });
    });
};
