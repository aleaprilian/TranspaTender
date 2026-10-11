import fs from 'fs';
import path from 'path';
import solc from 'solc';

const contractPath = path.resolve('contracts', 'TranspaTender.sol');
const source = fs.readFileSync(contractPath, 'utf8');

const input = {
  language: 'Solidity',
  sources: {
    'TranspaTender.sol': {
      content: source,
    },
  },
  settings: {
    outputSelection: {
      '*': {
        '*': ['abi', 'evm.bytecode'],
      },
    },
    optimizer: {
      enabled: true,
      runs: 200,
    },
  },
};

console.log('Compiling TranspaTender.sol...');
const output = JSON.parse(solc.compile(JSON.stringify(input)));

if (output.errors) {
  let hasError = false;
  output.errors.forEach((err) => {
    console.error(err.formattedMessage);
    if (err.severity === 'error') hasError = true;
  });
  if (hasError) process.exit(1);
}

const contract = output.contracts['TranspaTender.sol']['TranspaTender'];
const abi = contract.abi;
const bytecode = contract.evm.bytecode.object;

const exportData = {
  contractName: 'TranspaTender',
  abi,
  bytecode: '0x' + bytecode,
};

fs.writeFileSync(
  path.resolve('src', 'contracts', 'TranspaTenderBuild.json'),
  JSON.stringify(exportData, null, 2),
  'utf8'
);

console.log('Successfully compiled TranspaTender.sol!');
console.log('ABI methods:', abi.filter(x => x.type === 'function').length);
console.log('Bytecode length:', bytecode.length);
