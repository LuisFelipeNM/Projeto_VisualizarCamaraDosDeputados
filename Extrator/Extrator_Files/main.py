from source.scrapper import scrapper
from source.network import network
from source.backbone import backbone
from source.communities import communities
from source.plot import plot_nework
from source.summarizer import summarizer
from source.utils import print_log, att_context, get_context

from datetime import datetime
import sys
import json
    
def clean_mode(mode: str, context: dict) -> str:
    if context['votacoes'] and context['deputados'] and context['discursos']:
        mode = mode.replace('s', '')

    if context['network'] or not ((context['votacoes'] and context['deputados']) or 's' in mode):
        mode = mode.replace('n', '')
    
    if 's' in mode and 'n' not in mode:
        mode += 'n'
        context['network'] = False

    if context['backbone'] or not(context['network'] or 'n' in mode):
        mode = mode.replace('b', '')
    
    if 'n' in mode and 'b' not in mode:
        mode += 'b'
        context['backbone'] = False

    if context['communities'] or not(context['backbone'] or 'b' in mode):
        mode = mode.replace('c', '')
    
    if 'b' in mode and 'c' not in mode:
        mode += 'c'
        context['communities'] = False

    return mode

def main():
    args = sys.argv[1:]
    year = int(args[0])
    mode = args[1]

    start = datetime(year, 1, 1)
    end = datetime(year, 12, 31)

    file_name = f"{start.strftime('%Y-%m-%d')}_{end.strftime('%Y-%m-%d')}"

    mode = clean_mode(mode, get_context(file_name))
    print(mode)
   
    with open(f"./data/logs/{file_name}.log", mode="w") as stdout:
        sys.stdout = stdout

        print_log(f"{'MAIN':<10}: EXECUÇÃO INICADA\n{' '*32}Inicio: {start.strftime('%d/%m/%Y')}\n{' '*32}Fim:    {end.strftime('%d/%m/%Y')}")
        
        if 's' in mode:
            process = scrapper(start, end, file_name)
            att_context({'votacoes': True,
                         'deputados': True}, file_name)
        
        if 'n' in mode:
            network(file_name)
            att_context({'network': True}, file_name)

        if 'b' in mode:
            backbone(file_name)
            att_context({'backbone': True}, file_name)

        if 'c' in mode:
            communities(file_name)
            att_context({'communities': True}, file_name)
        
        if 's' in mode and process != None:
            process.join()
            att_context({'discursos': True}, file_name)

        if 'm' in mode:
            summarizer(file_name)
            att_context({'summarization': True}, file_name)

        if 'p' in mode:
            plot_nework(file_name + '_raw', f"{file_name}_raw_net", "partido")
            plot_nework(file_name, f"{file_name}_backboned_net", "partido")
            plot_nework(file_name, f"{file_name}_net", "comunidade")
        
        print_log(f"{'MAIN':<10}: EXECUÇÃO COMPLETA")


if __name__ == "__main__":
    main()