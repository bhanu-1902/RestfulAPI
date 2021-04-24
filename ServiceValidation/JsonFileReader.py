import json
class json_file_reader:

    def __init__(self, filename):
        self.filename = filename
    @classmethod
    def readJson(self, filename):
        with open(filename) as f:
            return json.load(f)


