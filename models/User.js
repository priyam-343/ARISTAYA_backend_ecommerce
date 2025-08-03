const fs = require('fs');
const path = require('path');
const strip = require('strip-comments');

const rootDir = __dirname;
const excludeDirs = ['node_modules', '.git']; 

const targetExtensions = ['.js', '.jsx', '.ts', '.tsx'];

const walkSync = (dir, fileList = []) => {
  if (!fs.existsSync(dir)) {
    console.error(`Directory not found: ${dir}`);
    return fileList;
  }
  const files = fs.readdirSync(dir);

  files.forEach(file => {
    const filePath = path.join(dir, file);
    const fileStats = fs.statSync(filePath);

    if (fileStats.isDirectory()) {
      if (!excludeDirs.includes(file)) {
        walkSync(filePath, fileList);
      }
    } else if (fileStats.isFile()) {
      const fileExtension = path.extname(file).toLowerCase();
      if (targetExtensions.includes(fileExtension)) {
        fileList.push(filePath);
      }
    }
  });

  return fileList;
};

try {
  console.log("Starting a comprehensive search and removal of comments from all code files...");
  
  const allFilesToProcess = walkSync(rootDir);
  
  if (allFilesToProcess.length === 0) {
    console.log("No code files found to process. Exiting.");
    return;
  }
  
  allFilesToProcess.forEach(file => {
    try {
      const code = fs.readFileSync(file, 'utf8');
      const codeWithoutComments = strip(code);
      fs.writeFileSync(file, codeWithoutComments, 'utf8');
      console.log(`Successfully stripped comments from: ${file}`);
    } catch (err) {
      console.error(`Error processing file ${file}:`, err);
    }
  });

  console.log("\nProcess complete. All comments have been removed from the specified files.");
} catch (err) {
  console.error("An error occurred during the process:", err);
}
