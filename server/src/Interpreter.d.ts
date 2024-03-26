export class Compiler {
	compile(text: string, console: any, optimize: boolean): Uint8Array;
}

export class Opcodes {
	length(): number;

}

// const Compiler: object = {};

// 	parseInt: function(t: string)
// 	{
// 		if(t.startsWith("0x"))
// 			return parseInt(t.substr(2), 16)
// 		else if(t.startsWith("0b"))
// 			return parseInt(t.substr(2), 2)
// 		return parseInt(t);
// 	},

// 	compile: function (text: string, console: object, optimize = true)
// 	{
// 		const code: number[] = [];
// 		const lines = text.split("\n");
// 		const labels: object = {};
// 		const labelInstances = {};
// 		for(let i = 0; i < lines.length; i++)
// 		{
// 			let line = lines[i].trim();
// 			const c1 = line.indexOf(";");
// 			const c2 = line.indexOf("//");			
// 			const c = (c1 != -1) && (c1 < c2) ? c1 : c2;
// 			if(c > -1)
// 				line = line.substr(0, c).trim();
// 			let token = line.replace(/[\t| ].*/,'');
// 			if(token[token.length - 1] == ':')
// 			{
// 				const label = token.substr(0, token.length - 1);
// 				if(!isNaN(this.parseInt(label)))
// 					console.error("label can't be a number: " + label + " line " + i);
// 				if(label in labels)
// 					console.error("label already defined: " + token + " line " + i);
// 				labels[label] = code.length;
// 				line = line.substr(token.length).trim();
// 				token = line.replace(/[\t| ].*/,'');
// 			}
// 			if(token.length)
// 			{
// 				let opcode = Object.keys(Opcodes).find(k=>Opcodes[k]===token);
// 				if(opcode !== undefined)
// 				{
// 					if(token.startsWith("push")) //push
// 					{
// 						let bytes = (token == "pushb") ? 1 : token == "pushw" ? 2 : 4;
// 						line = line.substr(token.length).trim();
// 						token = line.replace(/[\t| ].*/,'');
// 						let v = this.parseInt(token);
// 						let isLabel = isNaN(v);
// 						if(isLabel) v = 0;
// 						if(optimize && !isLabel)
// 						{
// 							if(v < 256)
// 							{
// 								opcode = Object.keys(Opcodes).find(k=>Opcodes[k]==="pushb");
// 								bytes = 1;
// 							}
// 							else if(v < 0x10000)
// 							{
// 								opcode = Object.keys(Opcodes).find(k=>Opcodes[k]==="pushw");
// 								bytes = 2;
// 							}
// 						}
// 						this.appendInt(code, opcode, 1);
// 						if(isLabel)
// 						{
// 							if(token in labelInstances)
// 								labelInstances[token].push([code.length, bytes]);
// 							else
// 								labelInstances[token] = [[code.length, bytes]];
// 						}
// 						this.appendInt(code, v, bytes);
// 					}
// 					else
// 						this.appendInt(code, opcode, 1);
// 					line = line.substr(token.length).trim();
// 					if(line.length)
// 						console.error("extra characters: " + line + " in line " + i);
// 				}
// 				else
// 					console.error("unknown opcode: " + token + " in line " + i);
// 			}
// 			lines[i] = token;
// 		} 
// 		for(const label in labels)
// 			if(labelInstances[label])
// 				for(let j = 0; j < labelInstances[label].length; j++)
// 					this.writeInt(code, labelInstances[label][j][0], labels[label], labelInstances[label][j][1]);
// 		return new Uint8Array(code);
// 		}
// 	}

// 	export default { Compiler};
