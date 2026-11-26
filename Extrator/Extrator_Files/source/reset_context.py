from datetime import datetime, timedelta
import json


def reset_context():
    context = {}
    
    for ano in range(2018, 2025):
        inicio = datetime(ano, 1, 1)
        fim = datetime(ano, 12, 31)

        file_name = f"{inicio.strftime('%Y-%m-%d')}_{fim.strftime('%Y-%m-%d')}"

        context[file_name] = {
            'votacoes': False,
            'deputados': False,
            'discursos': False,
            'network': False,
            'backbone': False,
            'communities': False,
            'summarization': False
        }

    with open(f"./data/context.json", mode= 'w') as context_file:
        json.dump(context, context_file)

reset_context()


